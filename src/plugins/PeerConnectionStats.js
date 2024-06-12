'use strict';

/**
 * Instance peer connections plugin.
 * Provides peer connections statistics.
 */
module.exports = class PeerConnectionStats {
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
        let message = '<h1><span>&#9888;</span> Using a default TURN</h1>Performance is not optimal.';
        const warning = document.createElement('a');
        warning.classList.add('gm-default-turn-button');
        warning.classList.add('gm-icon-button');
        const hover = document.createElement('div');
        hover.className = 'gm-default-turn-used gm-hidden';
        if (this.instance.options.connectionFailedURL) {
            message = message + '<br>Click on the icon to learn more.';
            warning.href = this.instance.options.connectionFailedURL;
            warning.target = '_blank';
        }
        hover.innerHTML = message;
        warning.appendChild(hover);

        warning.onmouseenter = () => {
            hover.classList.remove('gm-hidden');
        };
        warning.onmouseleave = () => {
            hover.classList.add('gm-hidden');
        };
        const toolbar = this.instance.getChildByClass(this.instance.root, 'gm-toolbar');
        toolbar.appendChild(warning);
    }

    /**
     * Hide the default turn warning.
     */
    hideDefaultTurnWarning() {
        const element = this.instance.getChildByClass(this.instance.root, 'gm-default-turn-button');
        if (element) {
            element.remove();
        }
    }

    /**
     * Plugin destructor, responsible for removing all callbacks & bindings so that things are garbage-collected
     */
    destroy() {
        clearTimeout(this.timeoutID);
        delete this.connection;
        delete this.instance;
    }
};
