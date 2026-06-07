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
  const pasteEvents = number(behavior.pasteEvents, 0);
  const inputEvents = number(behavior.inputEvents, 0);
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

  if (pasteEvents > 0) {
    signals.push({
      key: 'pasted_form_input',
      label: 'User pasted one or more signup/login fields',
      score: policy.weights?.pastedInput || 18,
      block: false,
      reason: 'Pasted Form Input',
      pasteEvents,
      inputEvents
    });
  }

  if (elapsedMs > 0 && elapsedMs < Number(policy.humanVelocityMinMs || 1800)) {
    signals.push({
      key: pasteEvents > 0 ? 'fast_pasted_submission' : 'robotic_submission_speed',
      label: pasteEvents > 0 ? 'Form was submitted quickly after pasted input' : 'Form submitted faster than human baseline',
      score: pasteEvents > 0 ? (policy.weights?.fastPastedSubmission || 45) : (policy.weights?.roboticVelocity || 95),
      block: pasteEvents > 0 ? false : true,
      reason: pasteEvents > 0 ? 'Fast Pasted Submission' : 'Robotic Submission Speed',
      elapsedMs,
      pasteEvents,
      inputEvents
    });
  } else if (elapsedMs > 0 && elapsedMs < Number(policy.humanVelocityWarnMs || 3200) && keystrokes < 2 && pointerEvents < 1 && pasteEvents < 1) {
    signals.push({
      key: 'low_interaction_submission',
      label: 'Low interaction signup/login attempt',
      score: 35,
      block: false,
      reason: 'Low Interaction Submission',
      elapsedMs,
      keystrokes,
      pointerEvents,
      pasteEvents,
      inputEvents,
      focusEvents
    });
  }

  return {
    passed: !signals.some((signal) => signal.block),
    score: signals.reduce((total, signal) => total + Number(signal.score || 0), 0),
    signals
  };
};
