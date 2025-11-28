import { NextResponse, type NextRequest } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
    const requestUrl = request.nextUrl.clone()
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') ?? '/'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            requestUrl.pathname = next
            requestUrl.searchParams.delete('code')
            return NextResponse.redirect(requestUrl)
        }
    }

    // return the user to an error page with instructions
    requestUrl.pathname = '/auth/auth-code-error'
    return NextResponse.redirect(requestUrl)
}
