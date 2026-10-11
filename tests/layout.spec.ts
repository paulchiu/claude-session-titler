import { execFileSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(import.meta.dirname, '..')

const readJson = (path: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(ROOT, path), 'utf8')) as Record<string, unknown>

/** The folder the marketplace entry installs, relative to the repo root. */
const pluginFolder = (): string => {
  const marketplace = readJson('.claude-plugin/marketplace.json') as {
    plugins: { name: string; source: string }[]
  }
  const entry = marketplace.plugins.find((p) => p.name === 'session-titler')
  if (entry === undefined) throw new Error('No session-titler entry in the marketplace')
  return entry.source
}

describe('plugin folder', () => {
  it('holds the manifest the marketplace entry names', () => {
    const manifest = readJson(join(pluginFolder(), '.claude-plugin/plugin.json'))
    expect(manifest.name).toBe('session-titler')
  })

  it('ships only the manifest, icon, hooks and engine tests', () => {
    const tracked = execFileSync('git', ['ls-files'], {
      cwd: join(ROOT, pluginFolder()),
      encoding: 'utf8',
    })
    expect(tracked.trim().split('\n').sort()).toEqual([
      '.claude-plugin/icon.png',
      '.claude-plugin/plugin.json',
      'hooks/hooks.json',
      'hooks/register.ts',
      'hooks/title.ts',
      'tests/register.test.ts',
    ])
  })
})

describe('plugin icon', () => {
  const ICON = 'plugin/.claude-plugin/icon.png'
  const PNG_SIGNATURE = '89504e470d0a1a0a'

  it('is a square PNG between 512 and 2048 px under 2 MB', () => {
    const png = readFileSync(join(ROOT, ICON))
    const width = png.readUInt32BE(16)
    const height = png.readUInt32BE(20)

    expect(png.subarray(0, 8).toString('hex')).toBe(PNG_SIGNATURE)
    expect(width).toBe(height)
    expect(width).toBeGreaterThanOrEqual(512)
    expect(width).toBeLessThanOrEqual(2048)
    expect(statSync(join(ROOT, ICON)).size).toBeLessThan(2 * 1024 * 1024)
  })
})
