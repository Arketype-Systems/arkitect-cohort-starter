import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui'
export default function NotFoundPage() { return <div className="page"><EmptyState title="Page not found" action={<Link className="button primary" to="/">Return to dashboard</Link>}>The requested route does not exist in this starter.</EmptyState></div> }
