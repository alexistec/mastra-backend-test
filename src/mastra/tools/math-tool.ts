import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

type Token =
  | { type: 'number'; value: number }
  | { type: 'operator'; value: '+' | '-' | '*' | '/' }
  | { type: 'paren'; value: '(' | ')' };

function tokenize(expression: string): Token[] {
  const normalized = expression.replace(/\s+/g, '');
  const tokens: Token[] = [];
  let i = 0;

  while (i < normalized.length) {
    if (/[0-9.]/.test(normalized[i])) {
      let num = '';
      while (i < normalized.length && /[0-9.]/.test(normalized[i])) {
        num += normalized[i++];
      }
      tokens.push({ type: 'number', value: parseFloat(num) });
      continue;
    }

    if ('+-*/'.includes(normalized[i])) {
      tokens.push({ type: 'operator', value: normalized[i] as '+' | '-' | '*' | '/' });
      i += 1;
      continue;
    }

    if (normalized[i] === '(' || normalized[i] === ')') {
      tokens.push({ type: 'paren', value: normalized[i] as '(' | ')' });
      i += 1;
      continue;
    }

    throw new Error(`Invalid character in expression: "${normalized[i]}"`);
  }

  return tokens;
}

function evaluateTokens(tokens: Token[]): number {
  let index = 0;

  function parseExpression(): number {
    return parseAddition();
  }

  function parseAddition(): number {
    let left = parseMultiplication();
    while (index < tokens.length && tokens[index].type === 'operator') {
      const op = tokens[index].value;
      if (op !== '+' && op !== '-') break;
      index++;
      const right = parseMultiplication();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseMultiplication(): number {
    let left = parseUnary();
    while (index < tokens.length && tokens[index].type === 'operator') {
      const op = tokens[index].value;
      if (op !== '*' && op !== '/') break;
      index++;
      const right = parseUnary();
      if (op === '/') {
        if (right === 0) throw new Error('Division by zero');
        left = left / right;
      } else {
        left = left * right;
      }
    }
    return left;
  }

  function parseUnary(): number {
    if (index < tokens.length && tokens[index].type === 'operator' && tokens[index].value === '-') {
      index++;
      return -parseUnary();
    }
    if (index < tokens.length && tokens[index].type === 'operator' && tokens[index].value === '+') {
      index++;
      return parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    const token = tokens[index];
    if (!token) throw new Error('Unexpected end of expression');

    if (token.type === 'number') {
      index++;
      return token.value;
    }

    if (token.type === 'paren' && token.value === '(') {
      index++;
      const value = parseExpression();
      if (tokens[index]?.type !== 'paren' || tokens[index].value !== ')') {
        throw new Error('Missing closing parenthesis');
      }
      index++;
      return value;
    }

    throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
  }

  const result = parseExpression();
  if (index < tokens.length) {
    throw new Error('Invalid expression syntax');
  }
  return result;
}

function evaluateExpression(expression: string): number {
  const sanitized = expression.trim();
  if (!sanitized) {
    throw new Error('Expression cannot be empty');
  }

  if (!/^[0-9+\-*/().\s]+$/.test(sanitized)) {
    throw new Error('Only addition, subtraction, multiplication, and division are supported');
  }

  const tokens = tokenize(sanitized);
  const result = evaluateTokens(tokens);

  if (!Number.isFinite(result)) {
    throw new Error('Result is not a finite number');
  }

  return result;
}

export const calculatorTool = createTool({
  id: 'calculate',
  description: 'Evaluate basic arithmetic expressions using addition, subtraction, multiplication, and division.',
  inputSchema: z.object({
    expression: z
      .string()
      .describe('Arithmetic expression to evaluate, e.g. "2 + 2", "10 - 3 * 2", "(15 + 5) / 4"'),
  }),
  outputSchema: z.object({
    expression: z.string(),
    result: z.number(),
  }),
  execute: async (inputData) => {
    const result = evaluateExpression(inputData.expression);
    return {
      expression: inputData.expression,
      result,
    };
  },
});
