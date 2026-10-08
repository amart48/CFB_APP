/** Dark-set logo URL. Use size 48 for the 20px logo. Host is allowed in next.config. */
export function logoUrl(teamId: number, size = 48): string {
  return `https://cdn.collegefootballdata.com/logos-dark/${size}/${teamId}.png`;
}
