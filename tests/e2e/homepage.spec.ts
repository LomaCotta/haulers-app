import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should load and display key elements', async ({ page }) => {
    await page.goto('/')

    // Check for main heading
    await expect(page.getByRole('heading', { name: /Find Trusted Moving & Hauling Services/i })).toBeVisible()

    // Check for navigation links
    await expect(page.getByRole('link', { name: /Find Services/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Pricing/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Transparency/i })).toBeVisible()

    // Check for CTA buttons
    await expect(page.getByRole('link', { name: /Find Services/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Add Your Business/i })).toBeVisible()
  })

  test('should navigate to sign up page', async ({ page }) => {
    await page.goto('/')
    
    await page.getByRole('link', { name: /Get Started/i }).click()
    
    await expect(page).toHaveURL('/auth/signup')
    await expect(page.getByRole('heading', { name: /Create your account/i })).toBeVisible()
  })

  test('should navigate to find services page', async ({ page }) => {
    await page.goto('/')
    
    await page.getByRole('link', { name: /Find Services/i }).first().click()
    
    await expect(page).toHaveURL('/find')
    await expect(page.getByRole('heading', { name: /Find Services/i })).toBeVisible()
  })
})
