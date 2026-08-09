import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, describe, expect, it } from 'vitest'
import App from '../App'
import { ensureSeeded } from '../lib/db'

beforeAll(() => ensureSeeded())
describe('real application routes', () => {
  const routes = [
    ['/', 'Assessment command center'], ['/athletes', 'Athletes'], ['/athletes/ath-a', 'Jordan Ellis'], ['/testing', 'Testing'], ['/testing/new', 'New assessment'], ['/testing/session-draft/live', 'Synthetic Return Testing'], ['/testing/session-complete/review', 'Review assessment'], ['/database', 'Database'], ['/standards', 'Standards'], ['/reporting', 'Reporting'], ['/reporting/ath-a', 'Jordan Ellis'], ['/rankings?tab=leaderboards', 'Rankings'], ['/settings', 'Settings']
  ] as const
  it.each(routes)('renders %s as a distinct screen', async (path, heading) => { const view = render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>); expect((await screen.findAllByRole('heading', { name: heading }))[0]).toBeInTheDocument(); view.unmount() })
})
