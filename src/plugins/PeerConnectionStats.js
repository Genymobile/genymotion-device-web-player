/**
 * Instance peer connections plugin.
 * Provides peer connections statistics.
 */
export default class PeerConnectionStats {
    /**
     * Plugin initialization.
     *
     * @param {Object}            instance   Associated instance.
     * @param {RTCPeerConnection} connection WebRTC connection.
     * @param {number}            interval   Stats update interval in ms.
     */
    constructor(instance, connection, interval) {
        // Reference instance
        this.instance = instance;

        // Register plugin
        this.instance.peerConnectionStats = this;

        this.connection = connection;

        this.timeoutID = setTimeout(() => {
            this.connection.getStats(null).then((stats) => {
                stats.forEach((entry) => {
                    if (entry.kind === 'video') {
                        if (entry.type === 'inbound-rtp') {
                            const codec = stats.get(entry.codecId);
                            if (codec) {
                                this.logAndBroadcast('codec', codec.mimeType);
                            }
                        }
                        if (entry.type === 'track') {
                            this.logAndBroadcast('width', entry.frameWidth);
                            this.logAndBroadcast('height', entry.frameHeight);
                            this.logAndBroadcast(
                                'jitter',
                                Math.round((entry.jitterBufferDelay / entry.jitterBufferEmittedCount) * 1000),
                            );
                        }
                    }
                    if (entry.type === 'candidate-pair' && entry.state === 'succeeded') {
                        this.logAndBroadcast('rtt', entry.currentRoundTripTime * 1000);
                        const candidate = stats.get(entry.localCandidateId);
                        this.hideDefaultTurnWarning();
                        if (candidate && candidate.candidateType === 'relay') {
                            this.logAndBroadcast('turn', true);
                            if (this.instance.options.turn.default) {
                                this.logAndBroadcast('default', true);
                                this.displayDefaultTurnWarning();
                            } else {
                                this.logAndBroadcast('default', false);
                            }
                        } else {
                            this.logAndBroadcast('turn', false);
                        }
                    }
                });
            });
        }, interval);
    }

    /**
     * Format & send a stats event.
     *
     * @param {string} type  Event name.
     * @param {string} value Stat value.
     */
    logAndBroadcast(type, value) {
        this.instance.dispatchEvent(type, {msg: value});
    }

    /**
     * Creates & display the default turn warning.
     */
    displayDefaultTurnWarning() {
        const turnButtonWarning = this.instance.toolbarManager.registerButton({
            id: 'default-turn-warning',
            iconClass: 'gm-default-turn-button gm-active',
            onClick: () => {
                if (this.instance.options.connectionFailedURL) {
                    window.open(this.instance.options.connectionFailedURL, '_blank');
                }
            }
        });

        if (turnButtonWarning) {
            this.instance.toolbarManager.renderButton('default-turn-warning');
            let tooltipMsg = '⚠️ <b>Using a default TURN server. Performance is not optimal.</b>';
            if (this.instance.options.connectionFailedURL) {
                tooltipMsg = tooltipMsg + '<br><i>Click on the icon to learn more.</i>';
            }
            this.instance.tooltipManager.setTooltip(
                turnButtonWarning.htmlElement,
                tooltipMsg,
                this.instance.options.toolbarPosition === 'right' ? 'left' : 'right',
                null,
                true
            );
        }
        this.instance.toolbarManager.showButton('default-turn-warning');
    }

    /**
     * Hide the default turn warning.
     */
    hideDefaultTurnWarning() {
        this.instance.toolbarManager.hideButton('default-turn-warning');
    }

    /**
     * Plugin destructor, responsible for removing all callbacks & bindings so that things are garbage-collected
     */
    destroy() {
        clearTimeout(this.timeoutID);
        delete this.connection;
        delete this.instance;
    }
}
