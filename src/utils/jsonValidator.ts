export interface JsonValidationError {
  line?: number;
  col?: number;
  path: string;
  message: string;
}

export interface JsonValidationResult {
  valid: boolean;
  errors: JsonValidationError[];
  parsedData?: any;
}

export function validateStrictJsonFormat(jsonText: string): JsonValidationResult {
  const errors: JsonValidationError[] = [];

  if (!jsonText || !jsonText.trim()) {
    return {
      valid: false,
      errors: [
        {
          path: 'File',
          message: 'JSON ফাইলটি খালি (File content is empty).',
        },
      ],
    };
  }

  // Helper to get line number and column from character offset
  const getLineAndCol = (offset: number) => {
    let currentLine = 1;
    let col = 1;
    for (let i = 0; i < offset && i < jsonText.length; i++) {
      if (jsonText[i] === '\n') {
        currentLine++;
        col = 1;
      } else {
        col++;
      }
    }
    return { line: currentLine, col };
  };

  let inDoubleQuote = false;
  let inSingleQuote = false;
  let inBacktick = false;
  let isEscaped = false;

  const len = jsonText.length;

  for (let i = 0; i < len; i++) {
    const char = jsonText[i];
    const { line, col } = getLineAndCol(i);

    if (inDoubleQuote) {
      if (isEscaped) {
        // We are right after a backslash '\' inside a double-quoted string
        // Standard JSON valid escape characters: " \ / b f n r t u
        if (!'\\"$/bfnrtu'.includes(char)) {
          errors.push({
            line,
            col,
            path: `Line ${line}, Col ${col}`,
            message: `অকার্যকর ব্যাকস্ল্যাশ/এসকেপ সিকোয়েন্স ('\\${char}')। LaTeX সংকেতের জন্য ডাবল ব্যাকস্ল্যাশ ব্যবহার করুন (যেমন: '\\\\${char}')।`,
          });
        } else if ('ftrnb'.includes(char)) {
          // Check if single backslash was used before a LaTeX command keyword
          const restStr = jsonText.substring(i - 1);
          const latexMatch = restStr.match(/^\\(frac|text|right|begin|nu|neg|rho|tau|theta|tan|times|to|tilde|vec|sqrt|infty|alpha|beta|gamma|delta|lambda)\b/i);
          if (latexMatch) {
            errors.push({
              line,
              col,
              path: `Line ${line}, Col ${col}`,
              message: `LaTeX সংকেতে সিঙ্গেল ব্যাকস্ল্যাশ ('\\${latexMatch[1]}') পাওয়া গেছে। JSON ফরম্যাটে ব্যাকস্ল্যাশ অবশ্যই ডাবল করতে হবে (যেমন: '\\\\${latexMatch[1]}')।`,
            });
          }
        }
        isEscaped = false;
      } else if (char === '\\') {
        isEscaped = true;
      } else if (char === '"') {
        inDoubleQuote = false;
      } else if (char === '\n') {
        errors.push({
          line,
          col,
          path: `Line ${line}, Col ${col}`,
          message: `স্ট্রিংয়ের ভেতরে সরাসরি নিউলাইন (Unescaped newline) দেওয়া যাবে না। '\\n' ব্যবহার করুন।`,
        });
        inDoubleQuote = false;
      }
    } else if (inSingleQuote) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === '\\') {
        isEscaped = true;
      } else if (char === "'") {
        inSingleQuote = false;
      }
    } else if (inBacktick) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === '\\') {
        isEscaped = true;
      } else if (char === '`') {
        inBacktick = false;
      }
    } else {
      // OUTSIDE STRINGS
      if (char === '"') {
        inDoubleQuote = true;
        isEscaped = false;
      } else if (char === "'") {
        errors.push({
          line,
          col,
          path: `Line ${line}, Col ${col}`,
          message: `সিঙ্গেল কোট (' ') ব্যবহার করা নিষিদ্ধ। JSON এর সব কী (Key), স্ট্রিং ও অ্যারের এলিমেন্ট ডাবল কোটে (" ") হতে হবে।`,
        });
        inSingleQuote = true;
        isEscaped = false;
      } else if (char === '`') {
        errors.push({
          line,
          col,
          path: `Line ${line}, Col ${col}`,
          message: `ব্যাকটিক (\` \`) ব্যবহার করা নিষিদ্ধ। JSON এর সব কী (Key), স্ট্রিং ও অ্যারের এলিমেন্ট ডাবল কোটে (" ") হতে হবে।`,
        });
        inBacktick = true;
        isEscaped = false;
      } else if (char === ',') {
        // Check trailing comma before } or ]
        let nextIdx = i + 1;
        while (nextIdx < len && /\s/.test(jsonText[nextIdx])) {
          nextIdx++;
        }
        if (nextIdx < len && (jsonText[nextIdx] === '}' || jsonText[nextIdx] === ']')) {
          errors.push({
            line,
            col,
            path: `Line ${line}, Col ${col}`,
            message: `কমা বা অবজেক্ট/অ্যারের শেষে অপ্রয়োজনীয় কমা (Trailing comma) রয়েছে। '${jsonText[nextIdx]}' এর আগে কমা উঠিয়ে দিন।`,
          });
        }
      }
    }
  }

  // Check for unquoted invalid literals outside strings (True, False, TRUE, FALSE, NULL, Null, undefined, NaN, None)
  const textWithoutStrings = jsonText.replace(/"(?:[^"\\]|\\.)*"/g, (match) => ' '.repeat(match.length));
  
  const invalidWordRegex = /\b(True|False|TRUE|FALSE|Null|NULL|undefined|NaN|None|none)\b/g;
  let wordMatch: RegExpExecArray | null;
  while ((wordMatch = invalidWordRegex.exec(textWithoutStrings)) !== null) {
    const { line, col } = getLineAndCol(wordMatch.index);
    errors.push({
      line,
      col,
      path: `Line ${line}, Col ${col}`,
      message: `অকার্যকর টোকেন '${wordMatch[1]}'। বুলিয়ান (true/false) এবং null অবশ্যই ছোট হাতের (lowercase) ও কোট ছাড়া লিখতে হবে।`,
    });
  }

  // Try standard JSON.parse
  let parsedData: any = null;
  try {
    parsedData = JSON.parse(jsonText);
  } catch (parseErr: any) {
    let errLine: number | undefined;
    let errCol: number | undefined;

    const posMatch = parseErr.message.match(/position (\d+)/i);
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const loc = getLineAndCol(pos);
      errLine = loc.line;
      errCol = loc.col;
    }

    const lineMatch = parseErr.message.match(/line (\d+) column (\d+)/i);
    if (lineMatch) {
      errLine = parseInt(lineMatch[1], 10);
      errCol = parseInt(lineMatch[2], 10);
    }

    errors.push({
      line: errLine,
      col: errCol,
      path: errLine ? `Line ${errLine}${errCol ? `, Col ${errCol}` : ''}` : 'Syntax Error',
      message: `JSON পার্স করতে ব্যর্থ হয়েছে: ${parseErr.message}`,
    });

    return {
      valid: false,
      errors,
    };
  }

  // Post-parse structural type checking for Rule 4 ("Numbers must not be quoted", "Boolean values and null unquoted", "String elements in arrays/objects must use double quotes")
  if (parsedData) {
    const rawQuestions = Array.isArray(parsedData)
      ? parsedData
      : Array.isArray(parsedData.questions)
      ? parsedData.questions
      : Array.isArray(parsedData.data)
      ? parsedData.data
      : null;

    if (rawQuestions) {
      rawQuestions.forEach((item: any, idx: number) => {
        const itemPrefix = `Item #${idx + 1}`;

        // Check if star_rating is a string number like "3"
        if (typeof item.star_rating === 'string' && /^\d+$/.test(item.star_rating)) {
          errors.push({
            path: `${itemPrefix} (star_rating)`,
            message: `সংখ্যাত্মক মান (star_rating: "${item.star_rating}") ডাবল কোটে দেওয়া রয়েছে। নাম্বার ফিল্ড অবশ্যই আনকোটড হতে হবে (${item.star_rating})।`,
          });
        }

        // Check options values if options is an object
        if (item.options && typeof item.options === 'object' && !Array.isArray(item.options)) {
          Object.entries(item.options).forEach(([optKey, optVal]) => {
            if (typeof optVal === 'number' || typeof optVal === 'boolean') {
              errors.push({
                path: `${itemPrefix} -> options.${optKey}`,
                message: `অপশনের মানটি কোট ছাড়া দেওয়া হয়েছে (${optVal})। অপশনের ভ্যালু অবশ্যই স্ট্রিং ডাবল কোটে হতে হবে ("${optVal}")।`,
              });
            }
          });
        }

        // Check options array if options is an array
        if (Array.isArray(item.options)) {
          item.options.forEach((opt: any, oIdx: number) => {
            if (typeof opt === 'number' || typeof opt === 'boolean') {
              errors.push({
                path: `${itemPrefix} -> options[${oIdx}]`,
                message: `অ্যারের এলিমেন্টটি (${opt}) কোট ছাড়া দেওয়া রয়েছে। অ্যারের উপাদানগুলো অবশ্যই ডাবল কোটে স্ট্রিং হতে হবে ("${opt}")।`,
              });
            }
          });
        }

        // Check tags array if tags is an array
        if (Array.isArray(item.tags)) {
          item.tags.forEach((tag: any, tIdx: number) => {
            if (typeof tag === 'number' || typeof tag === 'boolean') {
              errors.push({
                path: `${itemPrefix} -> tags[${tIdx}]`,
                message: `ট্যাগের এলিমেন্টটি (${tag}) কোট ছাড়া দেওয়া রয়েছে। ট্যাগের উপাদানগুলো অবশ্যই ডাবল কোটে স্ট্রিং হতে হবে ("${tag}")।`,
              });
            }
          });
        }
      });
    }
  }

  // Deduplicate errors by path + message
  const uniqueErrors: JsonValidationError[] = [];
  const seen = new Set<string>();
  for (const err of errors) {
    const key = `${err.line || ''}_${err.col || ''}_${err.path}_${err.message}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueErrors.push(err);
    }
  }

  return {
    valid: uniqueErrors.length === 0,
    errors: uniqueErrors,
    parsedData,
  };
}
