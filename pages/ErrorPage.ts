import { type Page } from '@playwright/test';

export class ErrorPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string) {
    const response = await this.page.goto(path);
    return response;
  }

  get heading() {
    return this.page.locator('h1').first();
  }

  get nav() {
    return this.page.locator('nav').first();
  }

  get bodyText() {
    return this.page.locator('body');
  }
}
