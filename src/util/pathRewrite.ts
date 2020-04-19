import { NeovimClient as Neovim } from '@chemzqm/neovim'

type RewriteRules = {
  [prefix: string]: string
}

let _pathRewrite: (path: string) => string | null = null

export async function createPathRewrite(nvim: Neovim): Promise<(p: string) => string> {
  let rawRules = await nvim.call('coc#get_cygqwin_path_prefixes') as RewriteRules
  let rules: { regexp: RegExp; replace: string }[] = []
  if (rawRules && typeof rawRules === "object") {
    const addDirSep = (p: string) => p.endsWith('/') ? p : p + '/'
    rules = Object.entries(rawRules as RewriteRules)
      .filter(kv => kv[0] && kv[1])
      .map(kv => kv.map(addDirSep))
      .sort((a, b) => b[0].length - a[0].length)
      .map(([posix, win]) => ({ regexp: new RegExp('^' + posix, 'gi'), replace: win }))
  }
  if (rules && rules.length > 0) {
    const rewrite = (p: string) => rules.reduce((prev, { regexp, replace }) => prev.replace(regexp, replace), p)
    return (p) => {
      if (p) {
        p = p.replace(/\\/g, '/')
        if (p.indexOf(',') >= 0) {
          return p.split(',').map(rewrite).join(',')
        } else {
          return rewrite(p)
        }
      } else {
        return p;
      }
    }
  } else {
    return (p) => p;
  }
}

export const pathRewriteInit = async (nvim: Neovim): Promise<void> => {
  _pathRewrite = await createPathRewrite(nvim)
}

export const pathRewrite = (path: string): string => {
  if (_pathRewrite) {
    return _pathRewrite(path);
  } else {
    console.error("pathRewrite is not initialized ", path)
    return path;
  }
}

export default pathRewrite