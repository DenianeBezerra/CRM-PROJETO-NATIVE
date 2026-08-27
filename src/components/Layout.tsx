import { Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <main className="flex flex-col min-h-screen w-full bg-[#0A0A0A]">
      <Outlet />
    </main>
  )
}
