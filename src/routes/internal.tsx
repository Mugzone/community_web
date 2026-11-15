import { useEffect } from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { useSession } from '../components/SessionProvider'
import EventDetail from '../pages/score/EventDetail'
import EventList from '../pages/score/EventList'

export function PageRedirect() {
  const { pageId } = useParams()
  return <Navigate to={`/wiki/${pageId ?? ''}`} replace />
}

export function EventRoute() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const raw = params.get('eid') ?? params.get('id')
  const id = raw ? Number(raw) : 0
  return id > 0 ? <EventDetail /> : <EventList />
}

export function Logout() {
  const { signOut } = useSession()
  useEffect(() => {
    signOut()
  }, [signOut])
  return <Navigate to="/index" replace />
}
