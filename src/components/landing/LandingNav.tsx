'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, LogOut, Settings, Package, FolderOpen, Star, Map, ShoppingCart, LayoutTemplate } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase-browser'
import { SaveButton } from '@/components/editor/SaveButton'
import { SaveAsPresetButton } from '@/components/editor/SaveAsPresetButton'
import { useCartStore } from '@/hooks/useCartStore'
import { EmailConfirmBanner } from '@/components/EmailConfirmBanner'

const NAV_LINKS = [
  { label: 'Stadtposter', href: '/map' },
  { label: 'Sternenposter', href: '/star-map' },
  { label: 'Features', href: '/#features' },
  { label: 'Beispiele', href: '/#examples' },
  { label: 'Preise', href: '/#pricing' },
]

export function LandingNav() {
  const { user, loading, isAdmin } = useAuth()
  const [open, setOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const pathname = usePathname()
  const isEditor = pathname === '/map' || pathname === '/star-map'
  const cartCount = useCartStore((s) => s.items.length)
  useEffect(() => { setHydrated(true) }, [])

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : '?'

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center" aria-label="petite-moment Startseite">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo_1200x300.svg"
            alt="petite-moment"
            className="h-10 w-auto"
            width={224}
            height={56}
          />
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative text-sm text-gray-600 hover:text-gray-900 transition-colors py-1 after:content-[''] after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-gray-900 after:transition-transform after:duration-300 after:ease-out hover:after:scale-x-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {isEditor && user && <SaveButton />}
          {isEditor && isAdmin && <SaveAsPresetButton />}

          <Link
            href="/cart"
            className="relative p-1.5 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Warenkorb"
          >
            <ShoppingCart className="w-5 h-5 text-gray-700" />
            {hydrated && cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gray-900 text-white text-[10px] font-semibold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>

          {loading ? (
            <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="focus:outline-none">
                  <Avatar className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-gray-300 transition-all">
                    <AvatarFallback className="text-xs bg-gray-900 text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5">
                  <p className="text-xs font-medium text-gray-900 truncate">{user.email}</p>
                  {isAdmin && <p className="text-xs text-gray-400">Admin</p>}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/private" className="cursor-pointer">
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Meine Poster
                  </Link>
                </DropdownMenuItem>
                {pathname !== '/map' && (
                  <DropdownMenuItem asChild>
                    <Link href="/map" className="cursor-pointer">
                      <Map className="w-4 h-4 mr-2" />
                      Stadtposter
                    </Link>
                  </DropdownMenuItem>
                )}
                {pathname !== '/star-map' && (
                  <DropdownMenuItem asChild>
                    <Link href="/star-map" className="cursor-pointer">
                      <Star className="w-4 h-4 mr-2" />
                      Sternenposter
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/private/orders" className="cursor-pointer">
                    <Package className="w-4 h-4 mr-2" />
                    Meine Bestellungen
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/private/admin/orders" className="cursor-pointer">
                        <Settings className="w-4 h-4 mr-2" />
                        Bestellverwaltung
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/private/admin/presets" className="cursor-pointer">
                        <LayoutTemplate className="w-4 h-4 mr-2" />
                        Design-Presets
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/private/admin/masks" className="cursor-pointer">
                        <LayoutTemplate className="w-4 h-4 mr-2" />
                        Masken-Bibliothek
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Abmelden
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Anmelden</Link>
              </Button>
              {!isEditor && (
                <Button size="sm" asChild>
                  <Link href="/map">Poster erstellen</Link>
                </Button>
              )}
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="md:hidden p-2 -mr-2" aria-label="Menü öffnen">
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 pt-12">
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 text-sm rounded-md hover:bg-gray-100 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col gap-2">
                {user ? (
                  <>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/private" onClick={() => setOpen(false)}>Meine Poster</Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleLogout}>
                      Abmelden
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/login?next=${encodeURIComponent(pathname)}`} onClick={() => setOpen(false)}>Anmelden</Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link href="/map" onClick={() => setOpen(false)}>Poster erstellen</Link>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
      <EmailConfirmBanner />
    </header>
  )
}
