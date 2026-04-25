import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/features/auth/lib/constants";
import {
  getAuthCookieOptions,
  getCurrentUserByToken,
} from "@/features/auth/lib/server";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized",
      },
      { status: 401 },
    );
  }

  const user = await getCurrentUserByToken(token);

  if (!user) {
    const response = NextResponse.json(
      {
        success: false,
        message: "Unauthorized",
      },
      { status: 401 },
    );
    response.cookies.set(AUTH_COOKIE_NAME, "", {
      ...getAuthCookieOptions(),
      maxAge: 0,
    });
    return response;
  }

  return NextResponse.json({
    success: true,
    message: "Current user fetched",
    data: user,
  });
}

export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: "Session cleared",
  });

  response.cookies.set(AUTH_COOKIE_NAME, "", {
    ...getAuthCookieOptions(),
    maxAge: 0,
  });

  return response;
}
