import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import { weekdayLabelES } from './dateUtils';

type GridMap = Map<string, any[]>;

export interface ExportPlanillaArgs {
  dias: any[];
  vigiladores: any[];
  grid: GridMap;
  titulo: string;
  mes?: number;
  anio?: number;
}

export async function exportPlanillaExcel({ dias, vigiladores, grid, titulo }: ExportPlanillaArgs) {
  const dayLabels = (dias as any[]).map((d: any) => `${weekdayLabelES(d.fecha)} ${String(Number(String(d.fecha).split('-')[2])).padStart(2, '0')}`);
  const headers = ['Vigilador', ...dayLabels, 'Total', 'Diurnas', 'Nocturnas'];

  const data: any[][] = [];
  data.push(headers);

  const classifyMT = (turnos: any[]): string => {
    let hasM = false, hasT = false;
    for (const t of turnos) {
      const parts = String(t.hora_inicio || '').split(':');
      const hour = Number(parts[0] || 0);
      if (hour < 14) hasM = true; else hasT = true;
    }
    if (hasM && hasT) return 'M/T';
    if (hasM) return 'M';
    if (hasT) return 'T';
    return '';
  };

  (vigiladores as any[]).forEach((v: any) => {
    const topRow: any[] = [''];
    const bottomRow: any[] = [`Leg ${v.legajo} - ${v.apellido}, ${v.nombre}`];
    let total = 0, totalD = 0, totalN = 0;
    (dias as any[]).forEach((d: any) => {
      const key = `${d.id_dia_planilla}:${v.id_vigilador}`;
      const ts = (grid.get(key) || []) as any[];
      topRow.push(classifyMT(ts));
      const hours = ts.reduce((a, t) => a + Number(t.cantidad_horas || 0), 0);
      bottomRow.push(hours || 0);
      total += hours;
      totalD += ts.reduce((a, t) => a + Number(t.horas_diurnas || 0), 0);
      totalN += ts.reduce((a, t) => a + Number(t.horas_nocturnas || 0), 0);
    });
    topRow.push('', '', '');
    bottomRow.push(total, totalD, totalN);
    data.push(topRow);
    data.push(bottomRow);
  });

  // Summary rows: requeridas, trabajadas, cumplidas por día
  const reqRow: any[] = ['Horas requeridas'];
  const trabRow: any[] = ['Horas trabajadas'];
  const cumplRow: any[] = ['Horas cumplidas'];
  (dias as any[]).forEach((d: any) => {
    reqRow.push(Number(d.horas_requeridas || 0));
    trabRow.push(Number(d.horas_totales_trabajadas || 0));
    cumplRow.push(Number(d.horas_cumplidas || 0));
  });
  reqRow.push('', '', '');
  trabRow.push('', '', '');
  cumplRow.push('', '', '');
  data.push([]);
  data.push(reqRow);
  data.push(trabRow);
  data.push(cumplRow);

  // Build styled workbook with ExcelJS
  const wb = new Workbook();
  const ws = wb.addWorksheet('Planilla');
  const lastCol = headers.length;
  // Title row
  ws.addRow([titulo]);
  ws.mergeCells(1, 1, 1, lastCol);
  const titleRow = ws.getRow(1);
  titleRow.font = { bold: true, size: 14 } as any;
  titleRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true } as any;
  // Data rows
  ws.addRows(data);
  // Freeze first two rows (title + headers) and first column
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }];
  // Header style (row 2)
  const headerRow = ws.getRow(2);
  headerRow.font = { bold: true } as any;
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true } as any;
  // Borders and alignment
  const lastRow = ws.rowCount;
  for (let r = 1; r <= lastRow; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= lastCol; c++) {
      const cell = row.getCell(c);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      } as any;
      cell.alignment = { vertical: 'middle', horizontal: c === 1 ? 'left' : 'center', wrapText: true } as any;
    }
  }
  // Auto column widths
  const colWidths = Array.from({ length: lastCol }).map((_, c) => {
    const maxLen = data.reduce((m, r) => {
      const val = r[c];
      const len = (val === null || val === undefined) ? 0 : String(val).length;
      return Math.max(m, len);
    }, String(headers[c] || '').length);
    return Math.min(Math.max(maxLen + 2, 10), 32);
  });
  colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  const buf = await wb.xlsx.writeBuffer();
  const safeTitle = titulo.replace(/[\\/:*?"<>|]/g, '_');
  saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${safeTitle}.xlsx`);
}


