import React from 'react';
import ReactGA from 'react-ga';
import {GA_TRACKING_ID} from "./constants";

ReactGA.initialize(GA_TRACKING_ID);

const useAnalyticsEventTracker = (category) => {
    const eventTracker = (label, action) => {
        ReactGA.event({category, action, label});
    }
    return eventTracker;
}
export default useAnalyticsEventTracker;