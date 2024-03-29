import { CursorData } from './type'

export class Cursor {
  public static toString(data: CursorData): string {
    return Cursor.serialize(data)
  }

  public static toData(string: string): null | CursorData {
    try {
      return JSON.parse(Cursor.deserialize(string))
    } catch (error) {
      return null
    }
  }

  protected static serialize(data: CursorData): string {
    return Buffer.from(JSON.stringify(data))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  protected static deserialize(string: string): string {
    string = string
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(string.length + 4 - (string.length % 4), '=')
    return Buffer.from(string, 'base64').toString('utf8')
  }
}
