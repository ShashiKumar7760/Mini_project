import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import TranscriptPanel, { TranscriptItem } from '@/components/TranscriptPanel';
import VoiceWave from '@/components/VoiceWave';
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MeetingParticipant {
  id: string;
  name: string;
  isSpeaking: boolean;
  isVideoOn: boolean;
  isAudioOn: boolean;
}

interface GrammarFeedback {
  original: string;
  corrected: string;
  explanation: string;
}

export default function LiveMeeting() {
  const [roomId, setRoomId] = useState('');
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [grammarFeedback, setGrammarFeedback] = useState<GrammarFeedback[]>([]);
  const [participants] = useState<MeetingParticipant[]>([
    { id: '1', name: 'You', isSpeaking: false, isVideoOn: true, isAudioOn: true },
    { id: '2', name: 'AI Interviewer', isSpeaking: false, isVideoOn: true, isAudioOn: true },
  ]);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  const speechRecognition = useSpeechRecognition({
    onResult: handleSpeechResult,
    continuous: true,
    interimResults: true,
  });

  function analyzeGrammar(text: string): GrammarFeedback | null {
    // Simple grammar analysis - placeholder for real NLP
    const corrections: [RegExp, string, string][] = [
      [/\bi\b(?!\s+am|\s+have|\s+will|\s+would|\s+could|\s+should)/g, 'I', 'Capitalize "I" when referring to yourself'],
      [/\bdont\b/gi, "don't", 'Use apostrophe in contractions'],
      [/\bcant\b/gi, "can't", 'Use apostrophe in contractions'],
      [/\bwanna\b/gi, 'want to', 'Use formal language in interviews'],
      [/\bgonna\b/gi, 'going to', 'Use formal language in interviews'],
      [/\bkinda\b/gi, 'kind of', 'Use formal language in interviews'],
    ];

    for (const [pattern, replacement, explanation] of corrections) {
      if (pattern.test(text)) {
        return {
          original: text,
          corrected: text.replace(pattern, replacement),
          explanation,
        };
      }
    }
    return null;
  }

  function handleSpeechResult(text: string) {
    const newItem: TranscriptItem = {
      id: `user-${Date.now()}`,
      speaker: 'user',
      text,
      timestamp: new Date(),
    };
    
    // Check for grammar issues
    const feedback = analyzeGrammar(text);
    if (feedback) {
      newItem.grammarCorrection = feedback.corrected;
      setGrammarFeedback(prev => [...prev.slice(-4), feedback]);
    }
    
    setTranscript(prev => [...prev, newItem]);
  }

  function joinMeeting() {
    if (!roomId.trim()) {
      setRoomId(`room-${Math.random().toString(36).substring(7)}`);
    }
    setIsInMeeting(true);
    
    // Request camera access
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.error('Camera access denied:', err);
        });
    }
    
    // Start speech recognition
    speechRecognition.startListening();
    
    // Add welcome message
    const welcomeItem: TranscriptItem = {
      id: 'system-welcome',
      speaker: 'ai',
      text: 'Meeting started. Live transcription is active. Speak clearly for accurate transcription.',
      timestamp: new Date(),
    };
    setTranscript([welcomeItem]);
  }

  function leaveMeeting() {
    setIsInMeeting(false);
    speechRecognition.stopListening();
    
    // Stop camera
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }

  function toggleVideo() {
    setIsVideoOn(!isVideoOn);
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoOn;
      });
    }
  }

  function toggleAudio() {
    setIsAudioOn(!isAudioOn);
    if (isAudioOn) {
      speechRecognition.stopListening();
    } else {
      speechRecognition.startListening();
    }
  }

  useEffect(() => {
    return () => {
      speechRecognition.stopListening();
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (!isInMeeting) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Video className="h-6 w-6 text-primary" />
              Live Meeting Mode
            </CardTitle>
            <CardDescription>
              Join a meeting with live transcription and AI-assisted feedback
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Room ID (optional)</label>
              <Input
                placeholder="Enter room ID or leave empty to generate one"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium">Features in this mode:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  Live speech-to-text transcription
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  Real-time grammar correction
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  Video and audio controls
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  Transcript history panel
                </li>
              </ul>
            </div>
            
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-warning">Academic Demo</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This is a demonstration of the meeting interface. 
                    For a production system, you would integrate with WebRTC 
                    or a service like Zoom/Meet APIs.
                  </p>
                </div>
              </div>
            </div>
            
            <Button className="w-full btn-gradient" size="lg" onClick={joinMeeting}>
              <Video className="mr-2 h-5 w-5" />
              Join Meeting
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4">
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
          {/* User Video */}
          <div className="relative bg-foreground/90 rounded-xl overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={cn(
                "w-full h-full object-cover",
                !isVideoOn && "hidden"
              )}
            />
            {!isVideoOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-foreground">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary-foreground">You</span>
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-4 flex items-center gap-2">
              <span className="bg-black/50 text-white px-2 py-1 rounded text-sm">You</span>
              {speechRecognition.isListening && (
                <VoiceWave isActive className="scale-75" />
              )}
            </div>
          </div>

          {/* AI Interviewer Video (Placeholder) */}
          <div className="relative bg-foreground rounded-xl overflow-hidden aspect-video flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center">
              <span className="text-2xl font-bold text-accent-foreground">AI</span>
            </div>
            <div className="absolute bottom-4 left-4">
              <span className="bg-black/50 text-white px-2 py-1 rounded text-sm">AI Interviewer</span>
            </div>
          </div>
        </div>

        {/* Grammar Feedback Banner */}
        {grammarFeedback.length > 0 && (
          <Card className="bg-warning/10 border-warning/20">
            <CardContent className="py-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Grammar Suggestion</p>
                  <p className="text-sm text-muted-foreground">
                    {grammarFeedback[grammarFeedback.length - 1].explanation}
                  </p>
                  <p className="text-sm mt-1">
                    <span className="line-through text-muted-foreground">
                      {grammarFeedback[grammarFeedback.length - 1].original}
                    </span>
                    {' → '}
                    <span className="text-success font-medium">
                      {grammarFeedback[grammarFeedback.length - 1].corrected}
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Meeting Controls */}
        <div className="bg-card rounded-xl p-4 flex items-center justify-center gap-4">
          <Button
            variant={isAudioOn ? "secondary" : "destructive"}
            size="lg"
            className="w-14 h-14 rounded-full"
            onClick={toggleAudio}
          >
            {isAudioOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>
          
          <Button
            variant={isVideoOn ? "secondary" : "destructive"}
            size="lg"
            className="w-14 h-14 rounded-full"
            onClick={toggleVideo}
          >
            {isVideoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>
          
          <Button
            variant="destructive"
            size="lg"
            className="w-14 h-14 rounded-full"
            onClick={leaveMeeting}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
          
          <div className="border-l pl-4 ml-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{participants.length} participants</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Room: {roomId}
            </div>
          </div>
        </div>
      </div>

      {/* Transcript Sidebar */}
      <div className="lg:w-80 xl:w-96 flex flex-col gap-4">
        <TranscriptPanel items={transcript} className="flex-1 max-h-[calc(100vh-16rem)]" />
        
        {/* Live Speech Display */}
        {speechRecognition.transcript && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground mb-1">Speaking now...</p>
              <p className="text-sm">{speechRecognition.transcript}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
