import { Neovim } from '@chemzqm/neovim'
import path from 'path'
import { URI } from 'vscode-uri'
import { ListContext, ListItem } from '../../types'
import { mkdirp } from '../../util'
import { statAsync } from '../../util/fs'
import workspace from '../../workspace'
import BasicList from '../basic'

export default class FoldList extends BasicList {
  public defaultAction = 'edit'
  public description = 'list of current workspace folders'
  public name = 'folders'

  constructor(nvim: Neovim) {
    super(nvim)

    this.addAction('edit', async item => {
      let newPath = await nvim.call('input', ['Folder: ', item.label, 'file'])
      let stat = await statAsync(newPath)
      if (!stat || !stat.isDirectory()) {
        await nvim.command(`echoerr "invalid path: ${newPath}"`)
        return
      }
      workspace.renameWorkspaceFolder(item.label, newPath)
    }, { reload: true, persist: true })

    this.addAction('delete', async item => {
      workspace.removeWorkspaceFolder(item.label)
    }, { reload: true, persist: true })

    this.addAction('newfile', async item => {
      let file = await workspace.requestInput('File name', item.label + '/')
      let dir = path.dirname(file)
      let stat = await statAsync(dir)
      if (!stat || !stat.isDirectory()) {
        let success = await mkdirp(dir)
        if (!success) {
          workspace.showMessage(`Error creating new directory ${dir}`, 'error')
          return
        }
      }
      await workspace.createFile(file, { overwrite: false, ignoreIfExists: true })
      await this.jumpTo(URI.file(file).toString())
    })
  }

  public async loadItems(_context: ListContext): Promise<ListItem[]> {
    return workspace.folderPaths.map(p => {
      return { label: p }
    })
  }
}
