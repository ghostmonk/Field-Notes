import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
    const response = NextResponse.next();
    response.headers.set("X-Frame-Options", "DENY");
    
    // In production, redirect ghostmonk.com to www.ghostmonk.com for consistency
    if (process.env.NODE_ENV === 'production' && 
        req.nextUrl.hostname === 'ghostmonk.com') {
        const redirectUrl = new URL(req.url);
        redirectUrl.hostname = 'www.ghostmonk.com';
        return NextResponse.redirect(redirectUrl, 301);
    }
    
    return response;
}