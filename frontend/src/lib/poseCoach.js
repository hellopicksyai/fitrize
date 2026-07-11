import { useEffect, useRef, useState, useCallback } from "react";
import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

// MediaPipe BlazePose landmark indices we care about
const L = {
  NOSE: 0, LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14, LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_HIP: 23, RIGHT_HIP: 24, LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
};

const angle = (a, b, c) => {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const m = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  if (!m) return 180;
  return (Math.acos(Math.max(-1, Math.min(1, dot / m))) * 180) / Math.PI;
};

// A landmark is "seen" if MediaPipe is reasonably confident about it.
const seen = (p) => p && (p.visibility === undefined || p.visibility > 0.5);

// Which landmarks each exercise NEEDS to give an accurate reading.
const REQUIRED = {
  "Squat": [L.LEFT_HIP, L.LEFT_KNEE, L.LEFT_ANKLE, L.RIGHT_KNEE],
  "Push-ups": [L.LEFT_SHOULDER, L.LEFT_ELBOW, L.LEFT_WRIST, L.LEFT_HIP],
  "Pull-ups": [L.LEFT_SHOULDER, L.LEFT_ELBOW, L.LEFT_WRIST],
  "Shoulder Press": [L.LEFT_SHOULDER, L.LEFT_ELBOW, L.LEFT_WRIST],
  "Bicep Curls": [L.LEFT_SHOULDER, L.LEFT_ELBOW, L.LEFT_WRIST],
  "Lunges": [L.LEFT_HIP, L.LEFT_KNEE, L.LEFT_ANKLE],
  "Plank": [L.LEFT_SHOULDER, L.LEFT_HIP, L.LEFT_ANKLE],
  "Deadlift": [L.LEFT_SHOULDER, L.LEFT_HIP, L.LEFT_KNEE, L.LEFT_ANKLE],
  "Bench Press": [L.LEFT_SHOULDER, L.LEFT_ELBOW, L.LEFT_WRIST],
};

// How well can we see the body parts this exercise needs? 0..1
const visibilityFor = (ex, lm) => {
  const need = REQUIRED[ex] || REQUIRED["Squat"];
  const ok = need.filter((i) => seen(lm[i])).length;
  return ok / need.length;
};

// Squat: knee angle. <100° = down, >160° = up. Track depth, knee-cave, torso angle.
const analyzeSquat = (lm) => {
  const lKneeA = angle(lm[L.LEFT_HIP], lm[L.LEFT_KNEE], lm[L.LEFT_ANKLE]);
  const rKneeA = angle(lm[L.RIGHT_HIP], lm[L.RIGHT_KNEE], lm[L.RIGHT_ANKLE]);
  const kneeAngle = (lKneeA + rKneeA) / 2;
  const torso = angle(lm[L.LEFT_SHOULDER], lm[L.LEFT_HIP], lm[L.LEFT_KNEE]);
  // knee cave: knee_x vs ankle_x distance
  const kneeCave =
    Math.abs(lm[L.LEFT_KNEE].x - lm[L.LEFT_ANKLE].x) +
    Math.abs(lm[L.RIGHT_KNEE].x - lm[L.RIGHT_ANKLE].x);
  let issues = [];
  if (kneeAngle < 100 && torso < 60) issues.push("Chest up — keep torso more upright");
  if (kneeAngle > 110 && kneeAngle < 160) issues.push("Go deeper into the squat");
  if (kneeCave < 0.06) issues.push("Push knees out, track over toes");
  const score = Math.max(50, Math.round(100 - issues.length * 12));
  return { kneeAngle, torso, score, issues, phase: kneeAngle < 100 ? "down" : kneeAngle > 160 ? "up" : "mid" };
};

// Push-up: elbow angle. <90° = down, >160° = up. Check hip sag.
const analyzePushup = (lm) => {
  const lElbA = angle(lm[L.LEFT_SHOULDER], lm[L.LEFT_ELBOW], lm[L.LEFT_WRIST]);
  const rElbA = angle(lm[L.RIGHT_SHOULDER], lm[L.RIGHT_ELBOW], lm[L.RIGHT_WRIST]);
  const elbowAngle = (lElbA + rElbA) / 2;
  // hip sag: shoulder-hip-ankle near 180 = straight
  const bodyLine = angle(lm[L.LEFT_SHOULDER], lm[L.LEFT_HIP], lm[L.LEFT_ANKLE]);
  let issues = [];
  if (bodyLine < 160) issues.push("Tighten core — straight line shoulder to ankle");
  if (elbowAngle > 100 && elbowAngle < 160) issues.push("Lower further — chest closer to floor");
  const score = Math.max(50, Math.round(100 - issues.length * 12));
  return { elbowAngle, bodyLine, score, issues, phase: elbowAngle < 90 ? "down" : elbowAngle > 160 ? "up" : "mid" };
};

// Pull-up: chin over bar. Up phase when shoulders rise above wrists (shoulder.y < wrist.y in normalized coords)
const analyzePullup = (lm) => {
  const shY = (lm[L.LEFT_SHOULDER].y + lm[L.RIGHT_SHOULDER].y) / 2;
  const wrY = (lm[L.LEFT_WRIST].y + lm[L.RIGHT_WRIST].y) / 2;
  const elbowAngle = (
    angle(lm[L.LEFT_SHOULDER], lm[L.LEFT_ELBOW], lm[L.LEFT_WRIST]) +
    angle(lm[L.RIGHT_SHOULDER], lm[L.RIGHT_ELBOW], lm[L.RIGHT_WRIST])
  ) / 2;
  const gap = shY - wrY; // up: shoulder higher than wrists → negative
  let issues = [];
  if (elbowAngle > 165 && gap > 0.05) issues.push("Pull higher — chin over bar");
  if (elbowAngle < 90 && Math.abs(gap) < 0.04) issues.push("Stretch fully on the way down");
  const score = Math.max(50, Math.round(100 - issues.length * 12));
  return { elbowAngle, gap, score, issues, phase: gap < -0.02 ? "up" : gap > 0.08 ? "down" : "mid" };
};

// Shoulder Press: wrists overhead = up, near shoulders = down. Elbow extension.
const analyzeShoulderPress = (lm) => {
  const elbowAngle = (
    angle(lm[L.LEFT_SHOULDER], lm[L.LEFT_ELBOW], lm[L.LEFT_WRIST]) +
    angle(lm[L.RIGHT_SHOULDER], lm[L.RIGHT_ELBOW], lm[L.RIGHT_WRIST])
  ) / 2;
  const shY = (lm[L.LEFT_SHOULDER].y + lm[L.RIGHT_SHOULDER].y) / 2;
  const wrY = (lm[L.LEFT_WRIST].y + lm[L.RIGHT_WRIST].y) / 2;
  let issues = [];
  if (elbowAngle < 160 && wrY < shY - 0.15) issues.push("Lock out at the top");
  if (elbowAngle > 110 && wrY > shY) issues.push("Press higher — wrists above shoulders");
  const score = Math.max(50, Math.round(100 - issues.length * 12));
  return { elbowAngle, score, issues,
    phase: (elbowAngle > 160 && wrY < shY - 0.1) ? "up" : (elbowAngle < 100) ? "down" : "mid" };
};

// Bicep Curls: elbow angle. Down ~170°, up <60°.
const analyzeBicepCurl = (lm) => {
  const elbowAngle = (
    angle(lm[L.LEFT_SHOULDER], lm[L.LEFT_ELBOW], lm[L.LEFT_WRIST]) +
    angle(lm[L.RIGHT_SHOULDER], lm[L.RIGHT_ELBOW], lm[L.RIGHT_WRIST])
  ) / 2;
  // elbow drift: elbow should stay close to torso (x near hip x)
  const elbowDrift =
    Math.abs(lm[L.LEFT_ELBOW].x - lm[L.LEFT_HIP].x) +
    Math.abs(lm[L.RIGHT_ELBOW].x - lm[L.RIGHT_HIP].x);
  let issues = [];
  if (elbowDrift > 0.18) issues.push("Pin elbows to your sides");
  if (elbowAngle > 60 && elbowAngle < 150) issues.push("Curl fully or extend fully — own the range");
  const score = Math.max(50, Math.round(100 - issues.length * 12));
  // For curls "down" = arm extended (high angle), "up" = curled (low angle). Map to rep counter convention.
  return { elbowAngle, score, issues,
    phase: elbowAngle < 60 ? "down" : elbowAngle > 150 ? "up" : "mid" };
};

// Lunges: front-knee angle ~90° at bottom, ~170° at top. Use the lower knee (deeper bend).
const analyzeLunge = (lm) => {
  const lKneeA = angle(lm[L.LEFT_HIP], lm[L.LEFT_KNEE], lm[L.LEFT_ANKLE]);
  const rKneeA = angle(lm[L.RIGHT_HIP], lm[L.RIGHT_KNEE], lm[L.RIGHT_ANKLE]);
  const kneeAngle = Math.min(lKneeA, rKneeA); // the bent (front) leg
  const torso = angle(lm[L.LEFT_SHOULDER], lm[L.LEFT_HIP], lm[L.LEFT_KNEE]);
  let issues = [];
  if (kneeAngle > 110 && kneeAngle < 160) issues.push("Drop deeper — back knee toward floor");
  if (torso < 65) issues.push("Stay tall — chest up, shoulders back");
  const score = Math.max(50, Math.round(100 - issues.length * 12));
  return { kneeAngle, torso, score, issues,
    phase: kneeAngle < 100 ? "down" : kneeAngle > 160 ? "up" : "mid" };
};

// Plank: hold-only. Score on body-line straightness shoulder-hip-ankle.
const analyzePlank = (lm) => {
  const bodyLine = angle(lm[L.LEFT_SHOULDER], lm[L.LEFT_HIP], lm[L.LEFT_ANKLE]);
  let issues = [];
  if (bodyLine < 160) issues.push("Drive hips up — no sag");
  if (bodyLine > 195) issues.push("Lower the hips — no pike");
  // Score: 100 at 178°, falling off either side
  const score = Math.max(40, Math.round(100 - Math.abs(180 - bodyLine) * 4));
  return { bodyLine, score, issues, phase: "hold" };
};

// Deadlift: hip hinge. Hip angle (shoulder-hip-knee). Down ~90° (bent over), Up ~170° (locked out).
// Also check back rounding: torso (shoulder-hip-ankle) shouldn't be < 150 at the bottom.
const analyzeDeadlift = (lm) => {
  const lHipA = angle(lm[L.LEFT_SHOULDER], lm[L.LEFT_HIP], lm[L.LEFT_KNEE]);
  const rHipA = angle(lm[L.RIGHT_SHOULDER], lm[L.RIGHT_HIP], lm[L.RIGHT_KNEE]);
  const hipAngle = (lHipA + rHipA) / 2;
  // back-line: shoulder-hip-ankle. Lower = more rounded (bad).
  const backLine = angle(lm[L.LEFT_SHOULDER], lm[L.LEFT_HIP], lm[L.LEFT_ANKLE]);
  let issues = [];
  if (hipAngle < 120 && backLine < 130) issues.push("Flatten back — chest up, no rounding");
  if (hipAngle > 140 && hipAngle < 170) issues.push("Lock out — squeeze glutes at top");
  if (hipAngle > 100 && hipAngle < 140) issues.push("Hinge deeper to load hamstrings");
  const score = Math.max(50, Math.round(100 - issues.length * 12));
  return { hipAngle, backLine, score, issues,
    phase: hipAngle < 110 ? "down" : hipAngle > 165 ? "up" : "mid" };
};

// Bench Press: lying down. Elbow angle (shoulder-elbow-wrist). Down <90° (bar at chest), Up >160° (lockout).
const analyzeBenchPress = (lm) => {
  const lElbA = angle(lm[L.LEFT_SHOULDER], lm[L.LEFT_ELBOW], lm[L.LEFT_WRIST]);
  const rElbA = angle(lm[L.RIGHT_SHOULDER], lm[L.RIGHT_ELBOW], lm[L.RIGHT_WRIST]);
  const elbowAngle = (lElbA + rElbA) / 2;
  // wrists vs shoulders horizontal symmetry — keep press balanced
  const wristSpread = Math.abs(lm[L.LEFT_WRIST].y - lm[L.RIGHT_WRIST].y);
  let issues = [];
  if (elbowAngle > 100 && elbowAngle < 160) issues.push("Press to full lockout");
  if (elbowAngle < 70) issues.push("Don't bounce — control the bottom");
  if (wristSpread > 0.06) issues.push("Press evenly — left and right balanced");
  const score = Math.max(50, Math.round(100 - issues.length * 12));
  return { elbowAngle, score, issues,
    phase: elbowAngle < 95 ? "down" : elbowAngle > 160 ? "up" : "mid" };
};

const ANALYZERS = {
  "Squat": analyzeSquat,
  "Push-ups": analyzePushup,
  "Pull-ups": analyzePullup,
  "Shoulder Press": analyzeShoulderPress,
  "Bicep Curls": analyzeBicepCurl,
  "Lunges": analyzeLunge,
  "Plank": analyzePlank,
  "Deadlift": analyzeDeadlift,
  "Bench Press": analyzeBenchPress,
};

export const SUPPORTED_EXERCISES = Object.keys(ANALYZERS);


export const usePoseCoach = ({ exercise = "Squat" }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const landmarkerRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const lastPhaseRef = useRef("up");
  const holdStartRef = useRef(null);
  const startTimeRef = useRef(null);
  const scoresRef = useRef([]);
  const lastRepAtRef = useRef(0);      // for debouncing reps
  const [visible, setVisible] = useState(true); // is the body clearly seen?
  const [ready, setReady] = useState(false);
  const [live, setLive] = useState(false);
  const [reps, setReps] = useState(0);
  const repsRef = useRef(0);
  const [score, setScore] = useState(95);
  const [cues, setCues] = useState([]);
  const [lastSession, setLastSession] = useState(null);
  const [facingMode, setFacingMode] = useState("user"); // "user" = front, "environment" = back
  const facingRef = useRef("user");
  const exerciseRef = useRef(exercise);

  useEffect(() => { exerciseRef.current = exercise; }, [exercise]);

  // Load model
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fileset = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
        );
        const lm = await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });
        if (!cancelled) { landmarkerRef.current = lm; setReady(true); }
      } catch (e) {
        console.error("Pose model load failed", e);
      }
    })();
    return () => { cancelled = true; landmarkerRef.current?.close?.(); };
  }, []);

  const loop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const lm = landmarkerRef.current;
    if (!video || !canvas || !lm || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    const ts = performance.now();
    const res = lm.detectForVideo(video, ts);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (res?.landmarks?.length) {
      const pts = res.landmarks[0];
      const draw = new DrawingUtils(ctx);
      const ex = exerciseRef.current;

      // How well can we see the parts this exercise needs?
      const vis = visibilityFor(ex, pts);
      const bodyVisible = vis >= 0.75;
      setVisible(bodyVisible);

      // Colour the skeleton green when we can track well, amber when we can't.
      const skeletonColor = bodyVisible ? "#39FF14" : "#FF9F0A";
      draw.drawConnectors(pts, PoseLandmarker.POSE_CONNECTIONS, { color: skeletonColor, lineWidth: 4 });
      draw.drawLandmarks(pts, { color: "#007AFF", radius: 5, lineWidth: 1 });

      if (!bodyVisible) {
        // Can't see enough of the body → don't count reps or give false form cues.
        setCues(["Step back so your whole body is in frame"]);
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const analyzer = ANALYZERS[ex] || analyzeSquat;
      const analysis = analyzer(pts);

      if (analysis.phase === "hold") {
        // Plank: accumulate hold-time as "reps" (= seconds held with good form)
        const nowMs = performance.now();
        if (analysis.score >= 70) {
          if (!holdStartRef.current) holdStartRef.current = nowMs;
          const secs = Math.floor((nowMs - holdStartRef.current) / 1000);
          repsRef.current = secs;
          setReps(secs);
        } else {
          holdStartRef.current = null;
        }
      } else {
        // rep count with hysteresis + debounce to prevent double-counts / jitter.
        if (analysis.phase === "down") lastPhaseRef.current = "down";
        if (analysis.phase === "up" && lastPhaseRef.current === "down") {
          const nowMs = performance.now();
          // require at least 500ms since the last rep — a real rep can't be faster
          if (nowMs - lastRepAtRef.current > 500) {
            lastPhaseRef.current = "up";
            lastRepAtRef.current = nowMs;
            repsRef.current += 1;
            setReps(r => r + 1);
          }
        }
      }
      setScore(prev => {
        const next = Math.round(prev * 0.7 + analysis.score * 0.3);
        scoresRef.current.push(next);
        return next;
      });
      setCues(analysis.issues);
    } else {
      // No person detected at all
      setVisible(false);
      setCues(["No person detected — make sure you're in view"]);
    }
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const start = useCallback(async () => {
    if (!ready) return false;
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingRef.current, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = s;
      const v = videoRef.current;
      if (v) {
        v.srcObject = s;
        // Keep the camera alive if the browser tries to pause it (fixes "camera switching off")
        v.onloadedmetadata = () => v.play().catch(() => {});
        await v.play().catch(() => {});
      }
      setLive(true);
      setReps(0);
      repsRef.current = 0;
      setLastSession(null);
      lastPhaseRef.current = "up";
      holdStartRef.current = null;
      startTimeRef.current = performance.now();
      scoresRef.current = [];
      lastRepAtRef.current = 0;
      rafRef.current = requestAnimationFrame(loop);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }, [ready, loop]);

  // Flip between front and back camera. If live, seamlessly restart the stream.
  const switchCamera = useCallback(async () => {
    const nextMode = facingRef.current === "user" ? "environment" : "user";
    facingRef.current = nextMode;
    setFacingMode(nextMode);
    if (!streamRef.current) return; // not live yet, will apply on next start
    // stop old tracks, get new stream with the new facing mode
    streamRef.current.getTracks().forEach(t => t.stop());
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextMode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = s;
      const v = videoRef.current;
      if (v) { v.srcObject = s; await v.play().catch(() => {}); }
    } catch (e) {
      console.error("Camera switch failed:", e);
    }
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (startTimeRef.current) {
      const duration_sec = Math.max(1, Math.round((performance.now() - startTimeRef.current) / 1000));
      const scores = scoresRef.current;
      const avg_form_score = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      setLastSession({
        exercise: exerciseRef.current,
        reps: repsRef.current,
        duration_sec,
        avg_form_score,
      });
    }
    startTimeRef.current = null;
    setLive(false);
  }, []); // no deps → stable reference, camera never stops on rep change

  // Clean up the camera only when the component actually unmounts.
  const stopRef = useRef(stop);
  stopRef.current = stop;
  useEffect(() => () => stopRef.current(), []);

  return { videoRef, canvasRef, ready, live, reps, score, cues, visible, start, stop, switchCamera, facingMode, lastSession, clearSession: () => setLastSession(null) };
};
