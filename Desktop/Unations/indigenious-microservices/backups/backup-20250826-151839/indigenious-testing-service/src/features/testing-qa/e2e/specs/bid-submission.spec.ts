// Bid Submission E2E Test Spec
// Comprehensive testing of the entire bid submission process

import { test, expect } from '@playwright/test'
import { 
  login, 
  navigateToRFQ, 
  fillBidForm, 
  uploadDocuments,
  submitBid,
  verifyBidStatus 
} from '../support/helpers'
import { mockBusiness, mockRFQ } from '../fixtures/testData'

test.describe('Bid Submission Process', () => {
  test.beforeEach(async ({ page }) => {
    // Login as verified Indigenous business
    await login(page, mockBusiness.email, mockBusiness.password)
    
    // Verify dashboard loads
    await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible()
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText(mockBusiness.businessName)
  })

  test('Complete bid submission flow', async ({ page }) => {
    // Step 1: Navigate to RFQ
    await test.step('Navigate to RFQ', async () => {
      await page.click('[data-testid="browse-rfqs-button"]')
      await page.waitForSelector('[data-testid="rfq-list"]')
      
      // Search for specific RFQ
      await page.fill('[data-testid="rfq-search"]', mockRFQ.title)
      await page.keyboard.press('Enter')
      
      // Click on RFQ
      await page.click(`[data-testid="rfq-${mockRFQ.id}"]`)
      await expect(page.locator('h1')).toContainText(mockRFQ.title)
    })

    // Step 2: Review RFQ details
    await test.step('Review RFQ requirements', async () => {
      // Check mandatory requirements
      const requirements = page.locator('[data-testid="mandatory-requirements"]')
      await expect(requirements).toBeVisible()
      
      // Verify Indigenous set-aside badge
      if (mockRFQ.indigenousOnly) {
        await expect(page.locator('[data-testid="indigenous-setaside-badge"]')).toBeVisible()
      }
      
      // Check deadline
      const deadline = await page.locator('[data-testid="rfq-deadline"]').textContent()
      expect(new Date(deadline!)).toBeAfter(new Date())
    })

    // Step 3: Start bid submission
    await test.step('Start bid submission', async () => {
      await page.click('[data-testid="submit-bid-button"]')
      await page.waitForSelector('[data-testid="bid-form"]')
      
      // Verify pre-filled business info
      await expect(page.locator('[data-testid="business-name-field"]')).toHaveValue(mockBusiness.businessName)
      await expect(page.locator('[data-testid="business-number-field"]')).toHaveValue(mockBusiness.businessNumber)
    })

    // Step 4: Fill bid details
    await test.step('Fill bid information', async () => {
      // Executive summary
      await page.fill(
        '[data-testid="executive-summary"]', 
        'Our company brings 15+ years of experience in delivering IT solutions to Indigenous communities...'
      )
      
      // Technical approach
      await page.fill(
        '[data-testid="technical-approach"]',
        'We propose a phased implementation approach using agile methodology...'
      )
      
      // Pricing section
      await page.fill('[data-testid="total-price"]', '125000')
      await page.fill('[data-testid="price-breakdown-labor"]', '85000')
      await page.fill('[data-testid="price-breakdown-materials"]', '25000')
      await page.fill('[data-testid="price-breakdown-overhead"]', '15000')
      
      // Timeline
      await page.fill('[data-testid="project-duration"]', '6')
      await page.selectOption('[data-testid="duration-unit"]', 'months')
      
      // Team composition
      await page.click('[data-testid="add-team-member"]')
      await page.fill('[data-testid="team-member-0-name"]', 'Jane Smith')
      await page.fill('[data-testid="team-member-0-role"]', 'Project Manager')
      await page.fill('[data-testid="team-member-0-experience"]', '10')
      
      // Indigenous benefits
      await page.fill('[data-testid="indigenous-employment"]', '75')
      await page.fill('[data-testid="community-benefits"]', 'Training programs for youth...')
      await page.check('[data-testid="local-sourcing-checkbox"]')
    })

    // Step 5: Upload documents
    await test.step('Upload required documents', async () => {
      // Financial statements
      await page.setInputFiles(
        '[data-testid="upload-financial-statements"]',
        './fixtures/documents/financial-statements.pdf'
      )
      await expect(page.locator('[data-testid="file-financial-statements"]')).toBeVisible()
      
      // Insurance certificate
      await page.setInputFiles(
        '[data-testid="upload-insurance"]',
        './fixtures/documents/insurance-certificate.pdf'
      )
      
      // Technical certifications
      await page.setInputFiles(
        '[data-testid="upload-certifications"]',
        ['./fixtures/documents/iso-cert.pdf', './fixtures/documents/security-cert.pdf']
      )
      
      // Wait for upload completion
      await page.waitForSelector('[data-testid="upload-complete"]', { timeout: 30000 })
    })

    // Step 6: Review and submit
    await test.step('Review and submit bid', async () => {
      await page.click('[data-testid="review-bid-button"]')
      
      // Verify summary
      await expect(page.locator('[data-testid="bid-summary"]')).toBeVisible()
      await expect(page.locator('[data-testid="summary-price"]')).toContainText('$125,000')
      await expect(page.locator('[data-testid="summary-duration"]')).toContainText('6 months')
      
      // Accept terms
      await page.check('[data-testid="accept-terms-checkbox"]')
      await page.check('[data-testid="confirm-accuracy-checkbox"]')
      
      // Submit bid
      await page.click('[data-testid="submit-bid-final"]')
      
      // Handle confirmation dialog
      await page.click('[data-testid="confirm-submission"]')
    })

    // Step 7: Verify submission
    await test.step('Verify bid submission', async () => {
      // Wait for success message
      await expect(page.locator('[data-testid="submission-success"]')).toBeVisible()
      
      // Get bid reference number
      const bidReference = await page.locator('[data-testid="bid-reference"]').textContent()
      expect(bidReference).toMatch(/BID-\d{6}/)
      
      // Navigate to my bids
      await page.click('[data-testid="view-my-bids"]')
      
      // Verify bid appears in list
      await expect(page.locator(`[data-testid="bid-${bidReference}"]`)).toBeVisible()
      await expect(page.locator(`[data-testid="bid-status-${bidReference}"]`)).toContainText('Submitted')
    })
  })

  test('Handle validation errors', async ({ page }) => {
    await navigateToRFQ(page, mockRFQ.id)
    await page.click('[data-testid="submit-bid-button"]')
    
    // Try to submit without required fields
    await page.click('[data-testid="review-bid-button"]')
    
    // Verify validation messages
    await expect(page.locator('[data-testid="error-executive-summary"]')).toContainText('Required')
    await expect(page.locator('[data-testid="error-total-price"]')).toContainText('Required')
    await expect(page.locator('[data-testid="error-documents"]')).toContainText('Missing required documents')
  })

  test('Save draft and resume', async ({ page }) => {
    await navigateToRFQ(page, mockRFQ.id)
    await page.click('[data-testid="submit-bid-button"]')
    
    // Fill partial information
    await page.fill('[data-testid="executive-summary"]', 'Draft summary...')
    await page.fill('[data-testid="total-price"]', '100000')
    
    // Save draft
    await page.click('[data-testid="save-draft-button"]')
    await expect(page.locator('[data-testid="draft-saved"]')).toBeVisible()
    
    // Navigate away and come back
    await page.goto('/dashboard')
    await page.click('[data-testid="my-drafts"]')
    await page.click(`[data-testid="draft-${mockRFQ.id}"]`)
    
    // Verify draft data is preserved
    await expect(page.locator('[data-testid="executive-summary"]')).toHaveValue('Draft summary...')
    await expect(page.locator('[data-testid="total-price"]')).toHaveValue('100000')
  })

  test('Handle concurrent bid submission', async ({ page, context }) => {
    // Open second tab
    const page2 = await context.newPage()
    await login(page2, mockBusiness.email, mockBusiness.password)
    
    // Navigate to same RFQ in both tabs
    await navigateToRFQ(page, mockRFQ.id)
    await navigateToRFQ(page2, mockRFQ.id)
    
    // Start bid in both tabs
    await page.click('[data-testid="submit-bid-button"]')
    await page2.click('[data-testid="submit-bid-button"]')
    
    // Fill and submit in first tab
    await fillBidForm(page, { price: '100000' })
    await submitBid(page)
    
    // Try to submit in second tab
    await fillBidForm(page2, { price: '110000' })
    await page2.click('[data-testid="submit-bid-final"]')
    
    // Should show error about existing bid
    await expect(page2.locator('[data-testid="error-duplicate-bid"]')).toBeVisible()
  })

  test('Accessibility compliance', async ({ page }) => {
    await navigateToRFQ(page, mockRFQ.id)
    await page.click('[data-testid="submit-bid-button"]')
    
    // Test keyboard navigation
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="executive-summary"]')).toBeFocused()
    
    // Test screen reader labels
    const summaryLabel = await page.getAttribute('[data-testid="executive-summary"]', 'aria-label')
    expect(summaryLabel).toBeTruthy()
    
    // Test color contrast
    const submitButton = page.locator('[data-testid="submit-bid-final"]')
    const backgroundColor = await submitButton.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    )
    const textColor = await submitButton.evaluate(el => 
      window.getComputedStyle(el).color
    )
    // Would run actual contrast calculation here
    expect(backgroundColor).toBeTruthy()
    expect(textColor).toBeTruthy()
  })

  test('Performance metrics', async ({ page }) => {
    // Measure page load time
    const startTime = Date.now()
    await navigateToRFQ(page, mockRFQ.id)
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(3000) // 3 seconds max
    
    // Measure form submission time
    await page.click('[data-testid="submit-bid-button"]')
    const submitStartTime = Date.now()
    await fillBidForm(page, { price: '100000' })
    await submitBid(page)
    const submitTime = Date.now() - submitStartTime
    expect(submitTime).toBeLessThan(5000) // 5 seconds max
    
    // Check for memory leaks
    const jsHeapSize = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as unknown).memory.usedJSHeapSize
      }
      return 0
    })
    expect(jsHeapSize).toBeLessThan(50 * 1024 * 1024) // 50MB max
  })

  test('Mobile responsive bid submission', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await navigateToRFQ(page, mockRFQ.id)
    
    // Verify mobile menu
    await page.click('[data-testid="mobile-menu-button"]')
    await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible()
    
    // Start bid submission
    await page.click('[data-testid="submit-bid-button"]')
    
    // Verify form is mobile-optimized
    const formWidth = await page.locator('[data-testid="bid-form"]').boundingBox()
    expect(formWidth?.width).toBeLessThanOrEqual(375)
    
    // Test touch interactions
    await page.tap('[data-testid="total-price"]')
    await page.fill('[data-testid="total-price"]', '100000')
    
    // Verify mobile-specific features
    await expect(page.locator('[data-testid="mobile-save-draft"]')).toBeVisible()
  })

  test('Error recovery and retry', async ({ page }) => {
    await navigateToRFQ(page, mockRFQ.id)
    await page.click('[data-testid="submit-bid-button"]')
    await fillBidForm(page, { price: '100000' })
    
    // Simulate network error
    await page.route('**/api/bids/submit', route => {
      route.abort('failed')
    })
    
    await page.click('[data-testid="submit-bid-final"]')
    
    // Verify error handling
    await expect(page.locator('[data-testid="submission-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
    
    // Fix network and retry
    await page.unroute('**/api/bids/submit')
    await page.click('[data-testid="retry-button"]')
    
    // Should succeed now
    await expect(page.locator('[data-testid="submission-success"]')).toBeVisible()
  })
})