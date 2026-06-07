const behaviorFromPayload = (payload = {}) => payload.behavior || payload.form?.behavior || {};

export const consoleDefender = ({ payload = {}, policy = {} }) => {
  const behavior = behaviorFromPayload(payload);
  const signals = [];
  const consoleSignals = behavior.consoleSignals || {};
  const inspectKeyCount = Number(consoleSignals.inspectKeyCount || 0);
  const devtoolsOpenSamples = Number(consoleSignals.devtoolsOpenSamples || 0);
  const devtoolsSuspected = consoleSignals.devtoolsSuspected === true || behavior.devtoolsSuspected === true;

  if (inspectKeyCount > 0 || devtoolsOpenSamples >= Number(policy.devtoolsOpenSampleLimit || 2) || devtoolsSuspected) {
    signals.push({
      key: 'console_inspection_signal',
      label: 'Browser inspection or devtools activity was detected',
      score: policy.weights?.consoleInspection || 75,
      block: policy.blockOnConsoleInspection !== false,
      reason: 'Console Inspection Detected',
      inspectKeyCount,
      devtoolsOpenSamples,
      devtoolsSuspected
    });
  }

  return {
    passed: !signals.some((signal) => signal.block),
    score: signals.reduce((total, signal) => total + Number(signal.score || 0), 0),
    signals
  };
};
