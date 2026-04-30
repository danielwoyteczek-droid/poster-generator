'use client'

import { useState, useEffect, Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Menu, X, LogOut, Settings, Package, FolderOpen, Star, Map, ShoppingCart, LayoutTemplate, Palette, LineChart, ChevronDown, ImageIcon } from 'lucide-react'
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
import { useCartStore } from '@/hooks/useCartStore'
import { useEditorStore, EDITOR_INITIAL_STATE } from '@/hooks/useEditorStore'
import { useStarMapStore, getStarMapInitialState } from '@/hooks/useStarMapStore'
import { usePhotoEditorStore } from '@/hooks/usePhotoEditorStore'
import { EmailConfirmBanner } from '@/components/EmailConfirmBanner'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

export interface OccasionNavLink {
  label: string
  href: string
}

interface LandingNavClientProps {
  /** Vom Server-Wrapper geladene, lokalisierte Anlass-Links für das
   *  Dropdown. Leeres Array → kein Dropdown rendern. */
  occasionLinks?: OccasionNavLink[]
}

export function LandingNavClient({ occasionLinks = [] }: LandingNavClientProps) {
  const t = useTranslations('nav')
  const tAria = useTranslations('navAria')
  const { user, loading, isAdmin } = useAuth()
  const [open, setOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const pathname = usePathname()
  const isEditor =
    pathname.endsWith('/map') ||
    pathname.endsWith('/star-map') ||
    pathname.endsWith('/photo')
  const cartCount = useCartStore((s) => s.items.length)
  const clearProjectBinding = useEditorStore((s) => s.clearProjectBinding)
  useEffect(() => { setHydrated(true) }, [])

  // Klick auf einen Editor-Top-Nav-Link = "Neues Poster anlegen": Project-
  // Binding lösen UND den Editor-Store in den Default-Zustand zurücksetzen,
  // damit der Editor wirklich frisch wirkt und nicht den State vom zuletzt
  // geladenen Projekt zeigt.
  const handleEditorNavClick = (target: '/map' | '/star-map' | '/photo') => {
    clearProjectBinding()
    if (target === '/map') {
      useEditorStore.setState(EDITOR_INITIAL_STATE, false)
    } else if (target === '/star-map') {
      useStarMapStore.setState(getStarMapInitialState(), false)
    } else if (target === '/photo') {
      usePhotoEditorStore.getState().resetPhotoEditor()
    }
  }

  const showOccasions = occasionLinks.length > 0

  // Locale-prefixed when active. usePathname already includes the locale
  // because next-intl rewrites our route, so /#features etc. anchor links
  // need to keep the leading slash; section anchors stay locale-relative.
  // Anlässe liegen zwischen Sternenposter und Features als Discovery-Vektor.
  const NAV_LINKS = [
    { label: t('cityPoster'), href: '/map' },
    { label: t('starPoster'), href: '/star-map' },
    { label: t('photoPoster'), href: '/photo' },
    { label: t('inspiration'), href: '/gallery' },
    { label: t('pricing'), href: '/#pricing' },
  ]

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : '?'

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center" aria-label={tAria('brandHome')}>
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
          {NAV_LINKS.map((link, i) => {
            const isEditorLink = link.href === '/map' || link.href === '/star-map' || link.href === '/photo'
            return (
            <Fragment key={link.href}>
              <Link
                href={link.href}
                onClick={isEditorLink ? () => handleEditorNavClick(link.href as '/map' | '/star-map' | '/photo') : undefined}
                className="relative text-sm text-muted-foreground hover:text-foreground transition-colors py-1 after:content-[''] after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-primary after:transition-transform after:duration-300 after:ease-out hover:after:scale-x-100"
              >
                {link.label}
              </Link>
              {i === 2 && showOccasions && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="relative text-sm text-muted-foreground hover:text-foreground transition-colors py-1 inline-flex items-center gap-1 after:content-[''] after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-[calc(100%-1rem)] after:origin-left after:scale-x-0 after:bg-primary after:transition-transform after:duration-300 after:ease-out hover:after:scale-x-100 focus:outline-none"
                      aria-label={t('occasions')}
                    >
                      {t('occasions')}
                      <ChevronDown className="w-3.5 h-3.5" aria-hidden />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {occasionLinks.map((link) => (
                      <DropdownMenuItem key={link.href} asChild>
                        <Link href={link.href} className="cursor-pointer">
                          {link.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </Fragment>
            )
          })}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {/* Editor-spezifische Save/Preset/Reset-Buttons leben jetzt in
              `EditorToolbar` direkt unter der Nav (statt in der Nav). */}

          <LanguageSwitcher />

          <Link
            href="/cart"
            className="relative p-1.5 rounded-md hover:bg-muted transition-colors"
            aria-label={tAria('cart')}
          >
            <ShoppingCart className="w-5 h-5 text-foreground/70" />
            {hydrated && cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>

          {loading ? (
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="focus:outline-none">
                  <Avatar className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-border transition-all">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5">
                  <p className="text-xs font-medium text-foreground truncate">{user.email}</p>
                  {isAdmin && <p className="text-xs text-muted-foreground">Admin</p>}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/private" className="cursor-pointer">
                    <FolderOpen className="w-4 h-4 mr-2" />
                    {t('myPosters')}
                  </Link>
                </DropdownMenuItem>
                {!pathname.endsWith('/map') && (
                  <DropdownMenuItem asChild>
                    <Link href="/map" className="cursor-pointer" onClick={() => handleEditorNavClick('/map')}>
                      <Map className="w-4 h-4 mr-2" />
                      {t('cityPoster')}
                    </Link>
                  </DropdownMenuItem>
                )}
                {!pathname.endsWith('/star-map') && (
                  <DropdownMenuItem asChild>
                    <Link href="/star-map" className="cursor-pointer" onClick={() => handleEditorNavClick('/star-map')}>
                      <Star className="w-4 h-4 mr-2" />
                      {t('starPoster')}
                    </Link>
                  </DropdownMenuItem>
                )}
                {!pathname.endsWith('/photo') && (
                  <DropdownMenuItem asChild>
                    <Link href="/photo" className="cursor-pointer" onClick={() => handleEditorNavClick('/photo')}>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {t('photoPoster')}
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/private/orders" className="cursor-pointer">
                    <Package className="w-4 h-4 mr-2" />
                    {t('myOrders')}
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/private/admin/orders" className="cursor-pointer">
                        <Settings className="w-4 h-4 mr-2" />
                        {t('adminOrders')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/private/admin/presets" className="cursor-pointer">
                        <LayoutTemplate className="w-4 h-4 mr-2" />
                        {t('adminPresets')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/private/admin/mockup-sets" className="cursor-pointer">
                        <LayoutTemplate className="w-4 h-4 mr-2" />
                        Mockup-Sets
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/private/admin/compositions" className="cursor-pointer">
                        <LayoutTemplate className="w-4 h-4 mr-2" />
                        Compositions
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/private/admin/render-library" className="cursor-pointer">
                        <LayoutTemplate className="w-4 h-4 mr-2" />
                        Render-Library
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/private/admin/masks" className="cursor-pointer">
                        <LayoutTemplate className="w-4 h-4 mr-2" />
                        {t('adminMasks')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/private/admin/palettes" className="cursor-pointer">
                        <Palette className="w-4 h-4 mr-2" />
                        {t('adminPalettes')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/private/admin/business-case" className="cursor-pointer">
                        <LineChart className="w-4 h-4 mr-2" />
                        {t('adminBusinessCenter')}
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/login?next=${encodeURIComponent(pathname)}`}>{t('login')}</Link>
              </Button>
              {!isEditor && (
                <Button size="sm" asChild>
                  <Link href="/map" onClick={() => handleEditorNavClick('/map')}>{t('createPoster')}</Link>
                </Button>
              )}
            </>
          )}
        </div>

        {/* Mobile: language + cart + hamburger */}
        <div className="flex md:hidden items-center gap-1">
          <LanguageSwitcher />
          <Link
            href="/cart"
            className="relative p-2 rounded-md hover:bg-muted transition-colors"
            aria-label={tAria('cart')}
          >
            <ShoppingCart className="w-5 h-5 text-foreground/70" />
            {hydrated && cartCount > 0 && (
              <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="p-2 -mr-2" aria-label={tAria('menuOpen')}>
                {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </SheetTrigger>
          <SheetContent side="right" className="w-64 pt-12">
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link, i) => {
                const isEditorLink = link.href === '/map' || link.href === '/star-map' || link.href === '/photo'
                return (
                <Fragment key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => { setOpen(false); if (isEditorLink) handleEditorNavClick(link.href as '/map' | '/star-map' | '/photo') }}
                    className="px-3 py-2.5 text-sm rounded-md hover:bg-muted transition-colors"
                  >
                    {link.label}
                  </Link>
                  {i === 2 && showOccasions && (
                    <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                      {t('occasions')}
                    </div>
                  )}
                  {i === 2 && showOccasions && occasionLinks.map((occ) => (
                    <Link
                      key={occ.href}
                      href={occ.href}
                      onClick={() => setOpen(false)}
                      className="pl-6 pr-3 py-2 text-sm text-muted-foreground rounded-md hover:bg-muted transition-colors"
                    >
                      {occ.label}
                    </Link>
                  ))}
                </Fragment>
                )
              })}
              <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
                {user ? (
                  <>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/private" onClick={() => setOpen(false)}>{t('myPosters')}</Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleLogout}>
                      {t('logout')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/login?next=${encodeURIComponent(pathname)}`} onClick={() => setOpen(false)}>{t('login')}</Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link href="/map" onClick={() => { setOpen(false); handleEditorNavClick('/map') }}>{t('createPoster')}</Link>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </SheetContent>
          </Sheet>
        </div>
      </div>
      <EmailConfirmBanner />
    </header>
  )
}
