export type CursorData =
  | number
  | bigint
  | string
  | Array<null | boolean | number | bigint | string>
  | Record<string, null | boolean | number | bigint | string>
