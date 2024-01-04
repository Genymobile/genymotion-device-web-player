'use strict';

const switchButton = (() => {
    const createSwitch = ({onChange}) => {
        let switchStatus = false;

        const switchDiv = document.createElement('div');
        switchDiv.style.position = 'relative';
        switchDiv.style.display = 'inline-block';
        switchDiv.style.width = '50px';
        switchDiv.style.height = '20px';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.style.opacity = '0';
        input.style.width = '0';
        input.style.height = '0';

        const slider = document.createElement('span');
        slider.style.position = 'absolute';
        slider.style.cursor = 'pointer';
        slider.style.top = '0';
        slider.style.left = '0';
        slider.style.right = '0';
        slider.style.bottom = '0';
        slider.style.backgroundColor = '#ccc';
        slider.style.transition = '.4s';
        slider.style.borderRadius = '15px';

        const sliderBefore = document.createElement('span');

        slider.addEventListener('click', () => {
            input.checked = !input.checked;
            if (input.checked) {
                switchStatus = true;
                slider.style.backgroundColor = '#E6195E';
                sliderBefore.style.transform = 'translateX(26px)';
            } else {
                switchStatus = false;
                slider.style.backgroundColor = '#ccc';
                sliderBefore.style.transform = 'translateX(0)';
            }
            if (onChange) {
                onChange(switchStatus);
            }
        });

        sliderBefore.style.position = 'absolute';
        sliderBefore.style.content = '';
        sliderBefore.style.height = '30px';
        sliderBefore.style.width = '30px';
        sliderBefore.style.left = '-3px';
        sliderBefore.style.bottom = '-5px';
        sliderBefore.style.backgroundColor = 'white';
        sliderBefore.style.transition = '.4s';
        sliderBefore.style.borderRadius = '50%';

        slider.appendChild(sliderBefore);

        switchDiv.appendChild(input);
        switchDiv.appendChild(slider);

        return switchDiv;
    };
    return {createSwitch};
})();

module.exports = {switchButton};

