const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const behavioralCheck = ({ payload = {}, policy = {} }) => {
  const behavior = payload.behavior || payload.form?.behavior || {};
  const submittedAt = number(behavior.submittedAt || Date.now(), Date.now());
  const firstSeenAt = number(behavior.firstInteractionAt || behavior.pageLoadedAt || behavior.startedAt, submittedAt);
  const elapsedMs = Math.max(0, submittedAt - firstSeenAt);
  const keystrokes = number(behavior.keystrokes, 0);
  const pointerEvents = number(behavior.pointerEvents, 0);
  const focusEvents = number(behavior.focusEvents, 0);
  const signals = [];

  if (behavior.webdriver === true || behavior.automation === true) {
    signals.push({
      key: 'webdriver_flag',
      label: 'Browser automation indicator',
      score: 100,
      block: true,
      reason: 'Automation Browser Detected'
    });
  }

  if (elapsedMs > 0 && elapsedMs < Number(policy.humanVelocityMinMs || 1800)) {
    signals.push({
      key: 'robotic_submission_speed',
      label: 'Form submitted faster than human baseline',
      score: policy.weights?.roboticVelocity || 95,
      block: true,
      reason: 'Robotic Submission Speed',
      elapsedMs
    });
  } else if (elapsedMs > 0 && elapsedMs < Number(policy.humanVelocityWarnMs || 3200) && keystrokes < 2 && pointerEvents < 1) {
    signals.push({
      key: 'low_interaction_submission',
      label: 'Low interaction signup/login attempt',
      score: 35,
      block: false,
      reason: 'Low Interaction Submission',
      elapsedMs,
      keystrokes,
      pointerEvents,
      focusEvents
    });
  }

  return {
    passed: !signals.some((signal) => signal.block),
    score: signals.reduce((total, signal) => total + Number(signal.score || 0), 0),
    signals
  };
};
