import DeviceRendererFactory from '../../src/DeviceRendererFactory.js';

describe('Safari browser detection', () => {
    const setUserAgent = (userAgent) => {
        Object.defineProperty(window.navigator, 'userAgent', {
            value: userAgent,
            configurable: true,
        });
    };

    it('should force showPhoneBorder to false on Safari', () => {
        setUserAgent(
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) \
          AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15');

        const factory = new DeviceRendererFactory();
        const dom = document.createElement('div');
        factory.loadTemplate(dom, {showPhoneBorder: true, toolbarPosition: 'right', floatingToolbar: true});

        expect(dom.querySelector('.gm-wrapper').classList.contains('phoneBorder')).toBe(false);
    });

    it('should keep showPhoneBorder enabled on Chrome', () => {
        setUserAgent(
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) \
          AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36');

        const factory = new DeviceRendererFactory();
        const dom = document.createElement('div');
        factory.loadTemplate(dom, {showPhoneBorder: true, toolbarPosition: 'right', floatingToolbar: true});

        expect(dom.querySelector('.gm-wrapper').classList.contains('phoneBorder')).toBe(true);
    });
});
