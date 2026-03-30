import parseShellStringToEJSON, {
  ParseMode,
} from '@mongodb-js/shell-bson-parser';

import { COLLATION_OPTIONS } from './constants';
import { toJSString } from './stringify';

/** @public */
const DEFAULT_FILTER = {};
/** @public */
const DEFAULT_SORT = null;
/** @public */
const DEFAULT_LIMIT = 0;
/** @public */
const DEFAULT_SKIP = 0;
/** @public */
const DEFAULT_PROJECT = null;
/** @public */
const DEFAULT_COLLATION = null;
/** @public */
const DEFAULT_MAX_TIME_MS = 60000; // 1 minute in ms
/** @public */
const DEFAULT_HINT = null;

function isEmpty(input: string | number | null | undefined): boolean {
  if (input === null || input === undefined) {
    return true;
  }
  const s = (typeof input === 'number' ? `${input}` : input).trim();

  if (s === '{}') {
    return true;
  }
  return s.length === 0;
}

function isNumberValid(input: string | number) {
  if (isEmpty(input)) {
    return 0;
  }
  return /^\d+$/.test(`${input}`) ? parseInt(`${input}`, 10) : false;
}

function _parseProject(input: string) {
  return parseShellStringToEJSON(input, { mode: ParseMode.Loose });
}

function _parseCollation(input: string) {
  return parseShellStringToEJSON(input, { mode: ParseMode.Loose });
}

/** @public */
export function parseSort(input: string) {
  if (isEmpty(input)) {
    return DEFAULT_SORT;
  }
  return parseShellStringToEJSON(input, { mode: ParseMode.Loose });
}

function isValueOkForHint() {
  /**
   * Prior to MongoDB 7.0, hint would accept invalid values, like NaN.
   * So we're on the looser side of validation here.
   */
  return true;
}

function _parseHint(input: string) {
  return parseShellStringToEJSON(input, { mode: ParseMode.Loose });
}

function _parseFilter(input: string) {
  return parseShellStringToEJSON(input, {
    mode: ParseMode.Loose,
    allowMethods: true,
  });
}

/** @public */
export function parseFilter(input: string) {
  if (isEmpty(input)) {
    return DEFAULT_FILTER;
  }
  return _parseFilter(input);
}

/** @public */
export function parseCollation(input: string) {
  if (isEmpty(input)) {
    return DEFAULT_COLLATION;
  }
  return _parseCollation(input);
}

/**
 * Validation function for a query `filter`. Must be a valid MongoDB query
 * according to the query language.
 * @public
 *
 * @return {Boolean|Object} false if not valid, or the parsed filter.
 */
export function isFilterValid(input: string) {
  if (isEmpty(input)) {
    return DEFAULT_FILTER;
  }
  try {
    return _parseFilter(input);
  } catch {
    return false;
  }
}

/**
 * Validation of collation object keys and values.
 * @public
 *
 * @param {Object} collation
 * @return {Boolean|Object} false if not valid, otherwise the parsed project.
 */
function _isCollationValid(collation: any) {
  for (const [key, value] of Object.entries(collation)) {
    if (!COLLATION_OPTIONS[key]) {
      return false;
    }
    if (
      COLLATION_OPTIONS[key as keyof typeof COLLATION_OPTIONS].includes(
        value as string | number | boolean,
      ) === false
    ) {
      return false;
    }
  }
  return collation;
}

/**
 * Validation function for a query `collation`.
 * @public
 *
 * @return {Boolean|Object} false if not valid, or the parsed filter.
 */
export function isCollationValid(input: string) {
  if (isEmpty(input)) {
    return DEFAULT_COLLATION;
  }
  try {
    const parsed = _parseCollation(input);
    return _isCollationValid(parsed);
  } catch {
    return false;
  }
}

function isValueOkForProject() {
  /**
   * Since server 4.4, project in find queries supports everything that
   * aggregations $project supports (which is basically anything at all) so we
   * effectively allow everything as a project value and keep this method for
   * the context
   *
   * @see {@link https://docs.mongodb.com/manual/release-notes/4.4/#projection}
   */
  return true;
}

/** @public */
export function parseProject(input: string) {
  if (isEmpty(input)) {
    return DEFAULT_PROJECT;
  }
  return _parseProject(input);
}

/**
 * Validation function for a query `project`. Must only have 0 or 1 as values.
 * @public
 *
 * @return {Boolean|Object} false if not valid, otherwise the parsed project.
 */
export function isProjectValid(input: string) {
  if (isEmpty(input)) {
    return DEFAULT_PROJECT;
  }

  try {
    const parsed = _parseProject(input);

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return false;
    }

    if (!Object.values(parsed).every(isValueOkForProject)) {
      return false;
    }

    return parsed;
  } catch {
    return false;
  }
}

const ALLOWED_SORT_VALUES = [1, -1, 'asc', 'desc'];

function isValueOkForSortDocument(val: any): boolean {
  return (
    ALLOWED_SORT_VALUES.includes(val) ||
    !!(typeof val === 'object' && val !== null && !Array.isArray(val) && (val as { $meta: string }).$meta)
  );
}

function isValueOkForSortArray(val: any): boolean {
  return (
    Array.isArray(val) &&
    val.length === 2 &&
    typeof val[0] === 'string' &&
    isValueOkForSortDocument(val[1])
  );
}

/**
 * Validation function for a query `sort`. Must only have -1 or 1 as values.
 * @public
 *
 * @return {Boolean|Object} false if not valid, otherwise the cleaned-up sort.
 */
export function isSortValid(input: string) {
  try {
    const parsed = parseSort(input);

    if (isEmpty(parsed)) {
      return DEFAULT_SORT;
    }

    if (Array.isArray(parsed) && parsed.every(isValueOkForSortArray)) {
      return parsed;
    }

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      Object.values(parsed).every(isValueOkForSortDocument)
    ) {
      return parsed;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Validation function for a query `hint`.
 * Must be a string, array, or a document with only -1 or 1 as values.
 * @public
 *
 * @return false if not valid, otherwise the cleaned-up hint.
 */
export function isHintValid(input: string) {
  if (isEmpty(input)) {
    return DEFAULT_HINT;
  }

  try {
    const parsed = _parseHint(input);

    if (typeof parsed === 'string') {
      return parsed;
    }

    if (Array.isArray(parsed) || typeof parsed !== 'object' || parsed === null) {
      return false;
    }

    if (!Object.values(parsed).every(isValueOkForHint)) {
      return false;
    }

    return parsed;
  } catch {
    return false;
  }
}

/**
 * Validation function for a query `maxTimeMS`. Must be digits only.
 * @public
 *
 * Returns false if not valid, otherwise the cleaned-up max time ms.
 */
export function isMaxTimeMSValid(input: string | number): number | false {
  if (isEmpty(input)) {
    return DEFAULT_MAX_TIME_MS;
  }
  return isNumberValid(input);
}

/**
 * Validation function for a query `skip`. Must be digits only.
 * @public
 *
 * Returns false if not valid, otherwise the cleaned-up skip.
 */
export function isSkipValid(input: string | number): number | false {
  if (isEmpty(input)) {
    return DEFAULT_SKIP;
  }
  return isNumberValid(input);
}

/**
 * Validation function for a query `limit`. Must be digits only.
 * @public
 *
 * Returns false if not valid, otherwise the cleaned-up limit.
 */
export function isLimitValid(input: string | number): number | false {
  if (isEmpty(input)) {
    return DEFAULT_LIMIT;
  }
  return isNumberValid(input);
}

const validatorFunctions = {
  isMaxTimeMSValid,
  isFilterValid,
  isProjectValid,
  isSortValid,
  isLimitValid,
  isSkipValid,
  isCollationValid,
  isNumberValid,
  isHintValid,
};

/** @public */
export function validate(what: string, input: string) {
  const validator =
    validatorFunctions[
      `is${what.charAt(0).toUpperCase() + what.slice(1)}Valid` as keyof typeof validatorFunctions
    ];
  if (!validator) {
    return false;
  }
  return validator(input);
}

/** @public */
export default function queryParser(
  filter: string,
  project: string | null = DEFAULT_PROJECT,
) {
  if (arguments.length === 1) {
    if (typeof filter === 'string') {
      return _parseFilter(filter);
    }
  }
  return {
    filter: _parseFilter(filter),
    project: project !== DEFAULT_PROJECT ? _parseProject(project) : project,
  };
}

export {
  toJSString,
  DEFAULT_FILTER,
  DEFAULT_SORT,
  DEFAULT_LIMIT,
  DEFAULT_SKIP,
  DEFAULT_PROJECT,
  DEFAULT_COLLATION,
  DEFAULT_MAX_TIME_MS,
  DEFAULT_HINT,
};
