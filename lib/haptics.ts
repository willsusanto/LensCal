export async function lightTap(): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(10);
  }
}

export async function warningTap(): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([10, 50, 10]);
  }
}
