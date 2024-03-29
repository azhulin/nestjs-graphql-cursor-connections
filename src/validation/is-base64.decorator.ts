import { ValidateBy, ValidationOptions, buildMessage, isBase64 } from 'class-validator'
import * as ValidatorJS from 'validator'

export function IsBase64(
  options?: ValidatorJS.IsBase64Options,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isBase64',
      constraints: [options],
      validator: {
        validate: (value, args): boolean => isBase64(value, args?.constraints[0]),
        defaultMessage: buildMessage(
          (eachPrefix) => eachPrefix + '$property must be base64 encoded',
          validationOptions,
        ),
      },
    },
    validationOptions,
  )
}
