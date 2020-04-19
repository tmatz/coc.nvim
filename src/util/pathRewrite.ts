import { NeovimClient as Neovim } from '@chemzqm/neovim'

type RewriteRules = {
  [prefix: string]: string
}

const DefaultPathPrefixes = { '/([A-Z])/': '$1:' }

let _pathRewrite: (path: string) => string | null = null

export async function createPathRewrite(nvim: Neovim): Promise<(p: string) => string> {
  let rawRules: RewriteRules = null;
  if (await nvim.eval('has("win32unix")')) {
    rawRules = await nvim.eval('get(g:, "coc_cygqwin_path_prefixes", v:null)') as RewriteRules
    if (rawRules == null) {
        rawRules = DefaultPathPrefixes
    }
  }
  let rules: { regexp: RegExp; replace: string }[] = []
  if (rawRules && typeof rawRules === "object") {
    rules = Object.keys(rawRules as RewriteRules)
      .filter(k => k && rawRules[k])
      .map(k => ({ regexp: new RegExp('^' + k, 'gi'), replace: rawRules[k] }))
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