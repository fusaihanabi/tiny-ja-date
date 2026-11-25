import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { copyFileSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const root = realpathSync(fileURLToPath(new URL("../", import.meta.url)))
const dependencies = realpathSync(join(root, "node_modules"))
assert.equal(relative(root, dependencies), "node_modules")

const npm = process.env.npm_execpath
assert.ok(npm, "Run this check with npm run check:package")

const consumer = mkdtempSync(join(dependencies, ".tiny-ja-date-package-"))
const cache = join(consumer, "npm-cache")
const tsc = join(dependencies, "typescript", "bin", "tsc")

try {
  const packed = execFileSync(process.execPath, [
    npm, "pack", "--offline", "--ignore-scripts", "--json",
    "--cache", cache, "--pack-destination", consumer,
  ], { cwd: root, encoding: "utf8" })
  const [{ filename }] = JSON.parse(packed)

  writeFileSync(join(consumer, "package.json"), JSON.stringify({
    name: "tiny-ja-date-consumer",
    private: true,
    type: "module",
  }))
  copyFileSync(join(root, "test", "package-consumer.mts"), join(consumer, "consumer.mts"))

  execFileSync(process.execPath, [
    npm, "install", "--offline", "--ignore-scripts", "--no-audit", "--no-fund",
    "--cache", cache, join(consumer, filename),
  ], { cwd: consumer, stdio: "inherit" })

  execFileSync(process.execPath, [
    tsc, "--strict", "--verbatimModuleSyntax", "--module", "NodeNext",
    "--target", "ES2020", "consumer.mts",
  ], { cwd: consumer, stdio: "inherit" })
  execFileSync(process.execPath, ["consumer.mjs"], { cwd: consumer, stdio: "inherit" })
  console.log(`Verified ${filename}: installed ESM imports, TypeScript types, and usage examples.`)
} finally {
  const directory = realpathSync(consumer)
  assert.equal(dirname(directory), dependencies)
  rmSync(directory, { recursive: true, force: true })
}
