type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const colors: Record<LogLevel, string> = {
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  debug: '\x1b[90m',
};

const reset = '\x1b[0m';

function log(level: LogLevel, message: string, meta?: unknown) {
  const timestamp = new Date().toISOString();
  const color = colors[level];
  const prefix = `[${timestamp}] ${color}${level.toUpperCase()}${reset}`;
  console.log(`${prefix} ${message}`);
  if (meta) {
    console.log(`${' '.repeat(timestamp.length + 4)}${JSON.stringify(meta, null, 2)}`);
  }
}

export const logger = {
  info: (message: string, meta?: unknown) => log('info', message, meta),
  warn: (message: string, meta?: unknown) => log('warn', message, meta),
  error: (message: string, meta?: unknown) => log('error', message, meta),
  debug: (message: string, meta?: unknown) => log('debug', message, meta),
};
