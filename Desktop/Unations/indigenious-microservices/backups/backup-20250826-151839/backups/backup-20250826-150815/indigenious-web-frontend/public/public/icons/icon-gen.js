// Icon generator script for desktop app
// This creates placeholder icons - replace with actual logo

const fs = require('fs')
const path = require('path')

// Create a simple SVG icon
const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e3a8a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#bg)"/>
  <text x="256" y="300" font-family="Arial, sans-serif" font-size="200" font-weight="bold" text-anchor="middle" fill="white">I</text>
  <text x="256" y="380" font-family="Arial, sans-serif" font-size="40" text-anchor="middle" fill="white">INDIGENIOUS</text>
</svg>
`

// Save SVG
fs.writeFileSync(path.join(__dirname, 'icon.svg'), svgIcon)

console.log('Icon placeholder created!')
console.log('Please replace with actual logo files:')
console.log('- icon.ico (Windows)')
console.log('- icon.icns (macOS)')
console.log('- icon-*.png (Linux and PWA)')