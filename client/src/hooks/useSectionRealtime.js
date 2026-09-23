import { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { connectSocket, getSocket } from '../utils/socket';
import {
  liveSubSectionCreated,
  liveSubSectionUpdated,
  liveSubSectionDeleted,
  liveSectionUpdated,
  liveCollaboratorsUpdated,
} from '../redux/slices/sectionSlice';

export const useSectionRealtime = (sectionId) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const currentUserId = user?._id?.toString();

  const [activeCollaborators, setActiveCollaborators] = useState([]);
  const [remoteFocusedBlocks, setRemoteFocusedBlocks] = useState({});
  const [activityStream, setActivityStream] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  const blurTimerRef = useRef({});

  useEffect(() => {
    if (!sectionId || !currentUserId) return;

    const socket = connectSocket();

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit('join_section', { sectionId });
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setActiveCollaborators([]);
      setRemoteFocusedBlocks({});
    };

    if (socket.connected) {
      handleConnect();
    } else {
      socket.on('connect', handleConnect);
    }
    socket.on('disconnect', handleDisconnect);

    // ── 1. Presence Updates ──
    const handlePresenceUpdate = ({ activeUsers }) => {
      if (Array.isArray(activeUsers)) {
        setActiveCollaborators(activeUsers);
      }
    };
    socket.on('presence_update', handlePresenceUpdate);

    // ── 2. Block Focus Indicators ──
    const handleInitialBlockFocus = ({ focuses }) => {
      if (Array.isArray(focuses)) {
        const focusMap = {};
        focuses.forEach(({ blockId, user: focusUser }) => {
          if (focusUser && focusUser.userId !== currentUserId) {
            focusMap[blockId] = focusUser;
          }
        });
        setRemoteFocusedBlocks(focusMap);
      }
    };
    socket.on('initial_block_focus', handleInitialBlockFocus);

    const handleBlockFocusChanged = ({ blockId, user: focusUser, focused }) => {
      if (!blockId) return;

      setRemoteFocusedBlocks((prev) => {
        const next = { ...prev };
        if (focused && focusUser && focusUser.userId !== currentUserId) {
          next[blockId] = focusUser;
        } else {
          delete next[blockId];
        }
        return next;
      });
    };
    socket.on('block_focus_changed', handleBlockFocusChanged);

    // ── 3. Real-Time Workspace Mutations ──
    const handleSubSectionCreated = ({ subSection }) => {
      if (subSection) {
        dispatch(liveSubSectionCreated(subSection));
      }
    };
    socket.on('subsection_created', handleSubSectionCreated);

    const handleSubSectionUpdated = ({ subSection }) => {
      if (subSection) {
        dispatch(liveSubSectionUpdated(subSection));
      }
    };
    socket.on('subsection_updated', handleSubSectionUpdated);

    const handleSubSectionDeleted = ({ subId }) => {
      if (subId) {
        dispatch(liveSubSectionDeleted(subId));
      }
    };
    socket.on('subsection_deleted', handleSubSectionDeleted);

    const handleSectionUpdated = ({ section }) => {
      if (section) {
        dispatch(liveSectionUpdated(section));
      }
    };
    socket.on('section_updated', handleSectionUpdated);

    const handleCollaboratorChanged = (payload) => {
      dispatch(liveCollaboratorsUpdated(payload));
    };
    socket.on('collaborator_changed', handleCollaboratorChanged);

    // ── 4. Collaborative Activity Feed ──
    const handleActivityEvent = (activity) => {
      setActivityStream((prev) => [activity, ...prev.slice(0, 49)]);
    };
    socket.on('activity_event', handleActivityEvent);

    return () => {
      socket.emit('leave_section', { sectionId });
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('presence_update', handlePresenceUpdate);
      socket.off('initial_block_focus', handleInitialBlockFocus);
      socket.off('block_focus_changed', handleBlockFocusChanged);
      socket.off('subsection_created', handleSubSectionCreated);
      socket.off('subsection_updated', handleSubSectionUpdated);
      socket.off('subsection_deleted', handleSubSectionDeleted);
      socket.off('section_updated', handleSectionUpdated);
      socket.off('collaborator_changed', handleCollaboratorChanged);
      socket.off('activity_event', handleActivityEvent);

      // Clear any pending blur timers
      Object.values(blurTimerRef.current).forEach(clearTimeout);
    };
  }, [sectionId, currentUserId, dispatch]);

  const emitBlockFocus = useCallback(
    (blockId) => {
      if (!sectionId || !blockId) return;
      if (blurTimerRef.current[blockId]) {
        clearTimeout(blurTimerRef.current[blockId]);
        delete blurTimerRef.current[blockId];
      }
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('block_focus', { sectionId, blockId });
      }
    },
    [sectionId],
  );

  const emitBlockBlur = useCallback(
    (blockId, delay = 0) => {
      if (!sectionId || !blockId) return;
      const doBlur = () => {
        const socket = getSocket();
        if (socket?.connected) {
          socket.emit('block_blur', { sectionId, blockId });
        }
      };

      if (delay > 0) {
        blurTimerRef.current[blockId] = setTimeout(doBlur, delay);
      } else {
        doBlur();
      }
    },
    [sectionId],
  );

  return {
    activeCollaborators,
    remoteFocusedBlocks,
    activityStream,
    isConnected,
    emitBlockFocus,
    emitBlockBlur,
  };
};

export default useSectionRealtime;
