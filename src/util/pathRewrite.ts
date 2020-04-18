import { NeovimClient as Neovim } from '@chemzqm/neovim'

type RewriteRule = {
  pattern: string;
  replace: string;
}

const DefaultRewriteRules = [{ pattern: '^/([A-Za-z])/', replace: '$1:' }]

let _pathRewrite: (path: string) => string | null = null

export async function createPathRewrite(nvim: Neovim): Promise<(p: string) => string> {
  let rawRules: RewriteRule[] = []
  if (await nvim.eval('has("win32unix")')) {
    rawRules = await nvim.eval('get(g:, "coc_cygpath_rewrite_rules", v:null)') as RewriteRule[]
    if (rawRules == null) {
        rawRules = DefaultRewriteRules
    }
  }
  const rules = rawRules
    ?.filter(({pattern, replace}) => pattern && replace)
    .map(({pattern, replace}) => ({ regexp: new RegExp(pattern), replace }))
  if (rules && rules.length > 0) {
    const rewrite = (p: string) => rules.reduce((prev, { regexp, replace }) => prev.replace(regexp, replace), p)
    return (p) => {
      if (p) {
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