// Credentials that often get pasted into chats and prompts.

export const secretPatterns = [
  { type: "PRIVATE_KEY", regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY(?: BLOCK)?-----[\s\S]+?-----END (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY(?: BLOCK)?-----/g },
  { type: "API_KEY", regex: /(?<![\w-])sk-ant-[A-Za-z0-9_-]{20,}/g },
  { type: "API_KEY", regex: /(?<![\w-])sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}(?![\w-])/g },
  { type: "API_KEY", regex: /(?<![\w])(?:AKIA|ASIA)[0-9A-Z]{16}(?![\w])/g },
  { type: "API_KEY", regex: /(?<![\w])AIza[0-9A-Za-z_-]{35}(?![\w-])/g },
  { type: "API_KEY", regex: /(?<![\w])(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})(?![\w])/g },
  { type: "API_KEY", regex: /(?<![\w])(?:sk|rk|pk)_(?:live|test)_[0-9A-Za-z]{16,}(?![\w])/g },
  { type: "API_KEY", regex: /(?<![\w])rzp_(?:live|test)_[A-Za-z0-9]{14,}(?![\w])/g },
  { type: "API_KEY", regex: /(?<![\w])xox[abprs]-[A-Za-z0-9-]{10,}(?![\w])/g },
  { type: "API_KEY", regex: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9\/]+/g },
  { type: "API_KEY", regex: /(?<![\w])(?:npm_[A-Za-z0-9]{36}|pypi-[A-Za-z0-9_-]{50,}|glpat-[A-Za-z0-9_-]{20})(?![\w])/g },
  { type: "JWT", regex: /(?<![\w-])eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(?![\w-])/g },
  { type: "BEARER_TOKEN", regex: /\bBearer\s+([A-Za-z0-9\-._~+/]{20,}=*)/gd, group: 1 },
  {
    type: "CONNECTION_STRING",
    regex: /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis|rediss|amqps?|mssql|sqlserver):\/\/[^\s:@\/]+:[^\s@\/]+@[^\s"'<>]+/gi,
  },
  { type: "URL_CREDENTIALS", regex: /\bhttps?:\/\/[^\s:@\/]+:([^\s@\/]+)@/gid, group: 1 },
  {
    type: "PASSWORD",
    regex: /(?:\bpassword|\bpasswd|\bpwd|\bpasscode|\bpass\s?word)\s*(?:is|hai|:|=|-)\s*["']?([^\s"',;]{4,64})/gid,
    group: 1,
    validator: (val) =>
      !/^(?:incorrect|wrong|required|invalid|expired|weak|strong|changed|reset|empty|missing|mandatory|correct|same|different|updated|sent|not|too|the|your|my|is|hai|kya|ki|ke|ka|hidden|protected)$/i.test(val),
  },
  {
    type: "API_KEY",
    regex: /(?:api[_-]?key|api[_-]?secret|secret[_-]?key|client[_-]?secret|access[_-]?token|auth[_-]?token|private[_-]?key)["']?\s*[:=]\s*["']?([A-Za-z0-9_\-./+=]{16,})/gid,
    group: 1,
  },
].map((p) => ({ priority: 100, severity: "critical", confidence: 0.95, ...p }));
