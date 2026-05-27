import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  initiateGoogleAuth() {
    // Passport handles redirect
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @Res() res: Response) {
    await this.authService.handleGoogleCallback(req.user, res);
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:3001');
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: any, @Res() res: Response) {
    return this.authService.refreshTokens(req.cookies?.refresh_token, res);
  }

  @Post('logout')
  async logout(@Req() req: any, @Res() res: Response) {
    return this.authService.logout(req.cookies?.refresh_token, res);
  }
}
