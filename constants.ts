
export const IVA_RATE = 0.19;

export const formatCLP = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) return '$0';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
  }).format(value);
};

export const validateRUT = (rut: string): boolean => {
  if (!/^[0-9]+-[0-9kK]{1}$/.test(rut)) return false;
  const tmp = rut.split('-');
  let digv = tmp[1];
  const rutBody = tmp[0];
  if (digv === 'K') digv = 'k';

  let M = 0, S = 1;
  let t = parseInt(rutBody);
  for (; t; t = Math.floor(t / 10))
    S = (S + t % 10 * (9 - M++ % 6)) % 11;

  const dv = S ? (S - 1).toString() : 'k';
  return dv === digv;
};
