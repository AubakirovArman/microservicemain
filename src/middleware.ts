import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth')
    const isAdminPage = req.nextUrl.pathname.startsWith('/admin')
    const isDashboardPage = req.nextUrl.pathname.startsWith('/dashboard')

    // Если пользователь не авторизован и пытается попасть на защищенные страницы
    if (!isAuth && (isAdminPage || isDashboardPage)) {
      return NextResponse.redirect(new URL('/auth/signin', req.url))
    }

    // Если пользователь авторизован и находится на странице входа
    if (isAuth && isAuthPage) {
      if (token?.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin', req.url))
      } else {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Если обычный пользователь пытается попасть в админку
    if (isAuth && isAdminPage && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const isAuthPage = req.nextUrl.pathname.startsWith('/auth')
        const isPublicPage = req.nextUrl.pathname === '/'
        
        // Разрешаем доступ к публичным страницам и страницам авторизации
        if (isAuthPage || isPublicPage) {
          return true
        }
        
        // Для всех остальных страниц требуется авторизация
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}