const BLANK_LINE_RUN = /\n{3,}/g;
const TRAILING_WHITESPACE = /[ \t]+$/gm;

export interface BaselineRewriteResult {
  output: string;
  transforms: string[];
}

function normalizeLineEndings(input: string): string {
  return input.replace(/\r\n?/g, "\n");
}

function replaceLeadingTabs(input: string): string {
  return input.replace(/^\t+/gm, (match) => "  ".repeat(match.length));
}

function collapseBlankLineRuns(input: string): string {
  return input.replace(BLANK_LINE_RUN, "\n\n");
}

function ensureTrailingNewline(input: string): string {
  const trimmed = input.replace(/\n+$/g, "");
  return `${trimmed}\n`;
}

export function applyBaselineRewrite(input: string): BaselineRewriteResult {
  const transforms: string[] = [];

  let current = input;

  const lineNormalized = normalizeLineEndings(current);
  if (lineNormalized !== current) {
    transforms.push("normalize-line-endings");
    current = lineNormalized;
  }

  const trailingWhitespaceTrimmed = current.replace(TRAILING_WHITESPACE, "");
  if (trailingWhitespaceTrimmed !== current) {
    transforms.push("trim-trailing-whitespace");
    current = trailingWhitespaceTrimmed;
  }

  const tabsReplaced = replaceLeadingTabs(current);
  if (tabsReplaced !== current) {
    transforms.push("replace-leading-tabs");
    current = tabsReplaced;
  }

  const blankLinesCollapsed = collapseBlankLineRuns(current);
  if (blankLinesCollapsed !== current) {
    transforms.push("collapse-blank-lines");
    current = blankLinesCollapsed;
  }

  const withFinalNewline = ensureTrailingNewline(current);
  if (withFinalNewline !== current) {
    transforms.push("ensure-trailing-newline");
    current = withFinalNewline;
  }

  return {
    output: current,
    transforms
  };
}
