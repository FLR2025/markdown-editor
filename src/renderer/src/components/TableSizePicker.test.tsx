// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TableSizePicker from './TableSizePicker'

afterEach(cleanup)

describe('TableSizePicker 交互', () => {
  it('点击 trigger 打开 picker', () => {
    render(
      <TableSizePicker onPick={vi.fn()}>
        <span>插入表格</span>
      </TableSizePicker>
    )

    // picker 默认不显示
    expect(screen.queryByRole('dialog', { name: '选择表格大小' })).toBeNull()

    // 点击按钮后显示
    fireEvent.click(screen.getByRole('button', { name: '插入表格' }))
    expect(screen.getByRole('dialog', { name: '选择表格大小' })).toBeTruthy()
  })

  it('点击格子回调 onPick', () => {
    const onPick = vi.fn()
    render(
      <TableSizePicker onPick={onPick} max={3}>
        <span>插入表格</span>
      </TableSizePicker>
    )

    fireEvent.click(screen.getByRole('button', { name: '插入表格' }))

    // 点击第一个格子 (1×1)
    const cells = screen.getAllByRole('gridcell')
    fireEvent.click(cells[0])

    expect(onPick).toHaveBeenCalledWith(1, 1)
  })

  it('无 trigger 时直接渲染 picker', () => {
    render(<TableSizePicker onPick={vi.fn()} max={3} />)
    expect(screen.getByRole('dialog', { name: '选择表格大小' })).toBeTruthy()
  })
})
