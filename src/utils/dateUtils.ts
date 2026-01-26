export function getWeekdayIndex(dateStr: string): number {
  const [yStr, mStr, dStr] = String(dateStr).split('-');
  let y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  if (m < 3) y -= 1;
  return (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[m - 1] + d) % 7;
}

export function weekdayLabelES(dateStr: string): string {
  const map = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return map[getWeekdayIndex(dateStr)];
}


