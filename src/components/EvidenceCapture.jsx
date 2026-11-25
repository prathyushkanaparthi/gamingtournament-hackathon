import { useEffect, useRef, useState } from 'react'
import { Camera, CircleStop, FileVideo2, MonitorUp, X } from 'lucide-react'

const MAX_VIDEO_BYTES = 100 * 1024 * 1024

export function EvidenceCapture({ file, onFileChange }) {
  const [error, setError] = useState('')
  const [recording, setRecording] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const uploadRef = useRef(null)

  useEffect(() => {
    if (!file) { setPreviewUrl(''); return undefined }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    streamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  const acceptFile = (nextFile) => {
    if (!nextFile) return
    if (!nextFile.type.startsWith('video/')) { setError('Choose a video file such as MP4 or WebM.'); onFileChange(null); return }
    if (nextFile.size > MAX_VIDEO_BYTES) { setError('Video must be 100 MB or smaller.'); onFileChange(null); return }
    setError('')
    onFileChange(nextFile)
  }
  const startRecording = async () => {
    setError('')
    if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === 'undefined') {
      setError('Screen recording is not supported here. Use video upload instead.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const options = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? { mimeType: 'video/webm;codecs=vp9' } : undefined
      const recorder = new MediaRecorder(stream, options)
      recorderRef.current = recorder
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data) }
      recorder.onerror = () => setError('Screen recording stopped unexpectedly. You can upload a clip instead.')
      recorder.onstop = () => {
        const type = recorder.mimeType || 'video/webm'
        const clip = new File(chunksRef.current, `screen-evidence-${Date.now()}.webm`, { type })
        if (clip.size) acceptFile(clip)
        else setError('The recording was empty. Try again or upload a video file.')
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        setRecording(false)
      }
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        if (recorder.state === 'recording') recorder.stop()
      }, { once: true })
      recorder.start(500)
      setRecording(true)
    } catch (recordingError) {
      setError(recordingError.name === 'NotAllowedError' ? 'Screen sharing was cancelled or denied. You can still upload a clip.' : `Could not start screen recording: ${recordingError.message}`)
    }
  }
  const stopRecording = () => { if (recorderRef.current?.state === 'recording') recorderRef.current.stop() }

  return <section className="evidence-capture">
    <div className="evidence-copy"><FileVideo2 size={19} /><div><strong>Video evidence (optional)</strong><p>Local demo storage only. Clips are private to you and authorized admins.</p></div></div>
    <div className="evidence-actions"><input ref={uploadRef} className="visually-hidden" type="file" accept="video/*" aria-label="Choose a video file to upload" onChange={(event) => acceptFile(event.target.files?.[0])} /><button className="button button-secondary" type="button" onClick={() => uploadRef.current?.click()}><FileVideo2 size={16} /> Upload a video</button>{recording ? <button className="button button-danger" type="button" onClick={stopRecording}><CircleStop size={16} /> Stop recording</button> : <button className="button button-secondary" type="button" onClick={startRecording}><MonitorUp size={16} /> Record screen</button>}</div>
    <p className="evidence-permission"><Camera size={14} /> Screen recording starts only when you choose “Record screen” and grant browser permission. Upload is always available as a fallback. Maximum file size: 100 MB.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    {file && <div className="evidence-preview"><video src={previewUrl} controls preload="metadata" aria-label="Video evidence preview" /><div><strong>{file.name}</strong><span>{(file.size / (1024 * 1024)).toFixed(1)} MB · Preview before sending</span><button type="button" aria-label="Remove video" onClick={() => { onFileChange(null); if (uploadRef.current) uploadRef.current.value = '' }}><X size={15} /> Remove</button></div></div>}
  </section>
}
