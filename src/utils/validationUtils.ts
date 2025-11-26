import { z } from 'zod';

interface ValidationRule {
  pattern?: string;
  message?: string;
}

interface ParameterDescription {
  title?: string;
  description?: string;
  type?: string;
  minLength?: number;
  maxLength?: number;
  validation?: ValidationRule;
  options?: string[];
  min?: number;
  max?: number;
  example?: string;
}

export interface ValidationError {
  isValid: boolean;
  error?: string;
}

/**
 * Validates an attribute value based on parameter description rules
 */
export const validateAttributeValue = (
  attributeName: string,
  value: string,
  parameterDescriptions: Record<string, ParameterDescription>
): ValidationError => {
  const param = parameterDescriptions[attributeName];
  
  // If no parameter description exists, consider it valid
  if (!param) {
    return { isValid: true };
  }

  try {
    let schema = z.string();

    // Apply minLength constraint
    if (param.minLength !== undefined) {
      schema = schema.min(param.minLength, {
        message: `Minimum length is ${param.minLength} characters`,
      });
    }

    // Apply maxLength constraint
    if (param.maxLength !== undefined) {
      schema = schema.max(param.maxLength, {
        message: `Maximum length is ${param.maxLength} characters`,
      });
    }

    // Apply regex pattern validation
    if (param.validation?.pattern) {
      const regex = new RegExp(param.validation.pattern);
      schema = schema.regex(regex, {
        message: param.validation.message || 'Invalid format',
      });
    }

    // Apply enum validation
    if (param.options && param.options.length > 0) {
      const enumSchema = z.enum(param.options as [string, ...string[]]);
      enumSchema.parse(value);
    }

    // Apply type-specific validation
    if (param.type === 'number') {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        return {
          isValid: false,
          error: 'Must be a valid number',
        };
      }

      let numSchema = z.number();
      
      if (param.min !== undefined) {
        numSchema = numSchema.min(param.min, {
          message: `Minimum value is ${param.min}`,
        });
      }

      if (param.max !== undefined) {
        numSchema = numSchema.max(param.max, {
          message: `Maximum value is ${param.max}`,
        });
      }

      numSchema.parse(numValue);
    }

    // Validate the value
    schema.parse(value);

    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      return {
        isValid: false,
        error: firstError?.message || 'Validation failed',
      };
    }
    return {
      isValid: false,
      error: 'Validation failed',
    };
  }
};

/**
 * Gets validation info for display (like placeholder, hint text)
 */
export const getValidationInfo = (
  attributeName: string,
  parameterDescriptions: Record<string, ParameterDescription>
): { placeholder?: string; hint?: string; pattern?: string } => {
  const param = parameterDescriptions[attributeName];
  
  if (!param) {
    return {};
  }

  const info: { placeholder?: string; hint?: string; pattern?: string } = {};

  if (param.example) {
    info.placeholder = `e.g., ${param.example}`;
  }

  if (param.validation?.message) {
    info.hint = param.validation.message;
  } else if (param.minLength || param.maxLength) {
    if (param.minLength === param.maxLength) {
      info.hint = `Must be exactly ${param.minLength} character(s)`;
    } else if (param.minLength && param.maxLength) {
      info.hint = `Length: ${param.minLength}-${param.maxLength} characters`;
    } else if (param.minLength) {
      info.hint = `Minimum ${param.minLength} character(s)`;
    } else if (param.maxLength) {
      info.hint = `Maximum ${param.maxLength} character(s)`;
    }
  }

  if (param.validation?.pattern) {
    info.pattern = param.validation.pattern;
  }

  return info;
};
