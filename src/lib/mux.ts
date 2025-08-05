import Mux from '@mux/mux-node'

if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
  throw new Error('Mux credentials are required. Please set MUX_TOKEN_ID and MUX_TOKEN_SECRET in your environment variables.')
}

// Initialize Mux client
const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
})

export const muxClient = mux

// Helper functions for common Mux operations
export const createMuxAsset = async (input: string, options?: {
  playbackPolicy?: 'public' | 'signed'
  mp4Support?: 'standard' | 'high' | 'none'
}) => {
  try {
    const asset = await mux.video.assets.create({
      input: input,
      playback_policy: [options?.playbackPolicy || 'public'],
      mp4_support: options?.mp4Support || 'standard',
    })
    
    return {
      assetId: asset.id,
      playbackId: asset.playback_ids?.[0]?.id,
      status: asset.status,
      duration: asset.duration
    }
  } catch (error) {
    console.error('Error creating Mux asset:', error)
    throw error
  }
}

export const getMuxAsset = async (assetId: string) => {
  try {
    const asset = await mux.video.assets.retrieve(assetId)
    return {
      assetId: asset.id,
      playbackId: asset.playback_ids?.[0]?.id,
      status: asset.status,
      duration: asset.duration,
      aspectRatio: asset.aspect_ratio,
      createdAt: asset.created_at
    }
  } catch (error) {
    console.error('Error retrieving Mux asset:', error)
    throw error
  }
}

export const createMuxDirectUpload = async () => {
  try {
    const upload = await mux.video.uploads.create({
      new_asset_settings: {
        playback_policy: ['public'],
        mp4_support: 'standard',
      },
      cors_origin: '*', // Configure this properly for production
    })
    
    return {
      uploadId: upload.id,
      uploadUrl: upload.url,
    }
  } catch (error) {
    console.error('Error creating Mux direct upload:', error)
    throw error
  }
}

export const deleteMuxAsset = async (assetId: string) => {
  try {
    await mux.video.assets.delete(assetId)
    return true
  } catch (error) {
    console.error('Error deleting Mux asset:', error)
    throw error
  }
}

// Webhook verification
export const verifyMuxWebhook = (rawBody: string, signature: string): boolean => {
  if (!process.env.MUX_WEBHOOK_SECRET) {
    console.warn('MUX_WEBHOOK_SECRET not set, skipping webhook verification')
    return true
  }
  
  try {
    return Mux.webhooks.verifyHeader(rawBody, signature, process.env.MUX_WEBHOOK_SECRET)
  } catch (error) {
    console.error('Error verifying Mux webhook:', error)
    return false
  }
}