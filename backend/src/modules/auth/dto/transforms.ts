import { Transform } from 'class-transformer';

/** E-mail: remove espacos das pontas e grava em minusculas (identificador unico). */
export const NormalizeEmail = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );

/** Nome: remove espacos redundantes sem eliminar caracteres validos. */
export const NormalizeName = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  );

/** Remove espacos das pontas (tokens e codigos). */
export const TrimString = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
