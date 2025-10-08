
import React from 'react';

const iconProps = {
  className: "w-5 h-5",
  viewBox: "0 0 20 20",
  fill: "currentColor"
};

export const UploadIcon = () => (
  <svg {...iconProps} xmlns="http://www.w3.org/2000/svg" >
    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
  </svg>
);

export const DownloadIcon = () => (
  <svg {...iconProps} xmlns="http://www.w3.org/2000/svg" >
    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

export const SaveIcon = () => (
    <svg {...iconProps} xmlns="http://www.w3.org/2000/svg">
        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v12l-5-3-5 3V4z" />
    </svg>
);

export const FirstIcon = () => (
    <svg {...iconProps} xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-8 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L4.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
    </svg>
);
export const LastIcon = () => (
    <svg {...iconProps} xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414zm8 0a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L16.586 10l-4.293-4.293z" clipRule="evenodd" />
    </svg>
);

export const PrevIcon = () => (
    <svg {...iconProps} xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);
export const NextIcon = () => (
    <svg {...iconProps} xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
);

export const ChessIcon = ({ className = "w-8 h-8" } : {className?: string}) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C10.3431 2 9 3.34315 9 5V6H15V5C15 3.34315 13.6569 2 12 2Z" fill="currentColor"/>
        <path d="M18 13V15H19V17H18V19H16V17H8V19H6V17H5V15H6V13C6 11.3431 7.34315 10 9 10H15C16.6569 10 18 11.3431 18 13Z" fill="currentColor"/>
        <path d="M8 7H16V9H8V7Z" fill="currentColor"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M4 21V20H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21Z" fill="currentColor"/>
    </svg>
);
