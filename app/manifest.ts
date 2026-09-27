import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TaskMaster',
    short_name: 'TaskMaster',
    description: 'AI-driven lifestyle and goal management assistant',
    start_url: '/',
    display: 'standalone', 
    background_color: '#fffaed', // 👈 CHANGE THIS to your exact Leaf Green hex
    theme_color: '#fffaed',      // 👈 Matches the top status bar to the splash screen
    // @ts-ignore - Required for legacy Android Chrome push compatibility
    gcm_sender_id: '103953800507',
    icons: [
      {
        src: '/sicon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable', 
      },
      {
        src: '/sicon.png', // It is best practice to provide an 'any' version too
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any', 
      }
    ],
  }
}