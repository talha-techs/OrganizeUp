import { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { connectSocket, getSocket, ensureSocketToken } from '../utils/socket';
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
    if (!sectionId) return;

    let active = true;
    let socketInstance = null;

    const initRealtime = async () => {
      // 1. Ensure token exists (retrieves from cookie session if not in localStorage)
      const token = await ensureSocketToken();
      if (!active) return;

      const socket = connectSocket(token);
      socketInstance = socket;

      const handleConnect = () => {
        if (!active) return;
        console.log(`[Realtime] Connected and joining room section:${sectionId}`);
        setIsConnected(true);
        socket.emit('join_section', { sectionId });
      };

      const handleDisconnect = (reason) => {
        if (!active) return;
        console.log('[Realtime] Section room disconnected:', reason);
        setIsConnected(false);
        setActiveCollaborators([]);
        setRemoteFocusedBlocks({});
      };

      const handleSocketError = (err) => {
        console.warn('[Realtime] Section room error:', err);
      };

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('error', handleSocketError);

      if (socket.connected) {
        handleConnect();
      }

      // ── 1. Presence Updates ──
      const handlePresenceUpdate = ({ activeUsers }) => {
        if (!active) return;
        if (Array.isArray(activeUsers)) {
          console.log('[Realtime] presence_update activeUsers:', activeUsers);
          setActiveCollaborators(activeUsers);
        }
      };
      socket.on('presence_update', handlePresenceUpdate);

      // ── 2. Block Focus Indicators ──
      const handleInitialBlockFocus = ({ focuses }) => {
        if (!active) return;
        if (Array.isArray(focuses)) {
          const focusMap = {};
          focuses.forEach(({ blockId, user: focusUser }) => {
            if (focusUser && String(focusUser.userId) !== String(currentUserId)) {
              focusMap[blockId] = focusUser;
            }
          });
          setRemoteFocusedBlocks(focusMap);
        }
      };
      socket.on('initial_block_focus', handleInitialBlockFocus);

      const handleBlockFocusChanged = ({ blockId, user: focusUser, focused }) => {
        if (!active || !blockId) return;

        setRemoteFocusedBlocks((prev) => {
          const next = { ...prev };
          if (focused && focusUser && String(focusUser.userId) !== String(currentUserId)) {
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
        if (!active || !subSection) return;
        console.log('⚡ [Realtime] New block received:', subSection.name);
        dispatch(liveSubSectionCreated(subSection));
      };
      socket.on('subsection_created', handleSubSectionCreated);

      const handleSubSectionUpdated = ({ subSection }) => {
        if (!active || !subSection) return;
        console.log('⚡ [Realtime] Block updated:', subSection.name);
        dispatch(liveSubSectionUpdated(subSection));
      };
      socket.on('subsection_updated', handleSubSectionUpdated);

      const handleSubSectionDeleted = ({ subId }) => {
        if (!active || !subId) return;
        console.log('⚡ [Realtime] Block deleted:', subId);
        dispatch(liveSubSectionDeleted(subId));
      };
      socket.on('subsection_deleted', handleSubSectionDeleted);

      const handleSectionUpdated = ({ section }) => {
        if (!active || !section) return;
        dispatch(liveSectionUpdated(section));
      };
      socket.on('section_updated', handleSectionUpdated);

      const handleCollaboratorChanged = (payload) => {
        if (!active) return;
        dispatch(liveCollaboratorsUpdated(payload));
      };
      socket.on('collaborator_changed', handleCollaboratorChanged);

      // ── 4. Collaborative Activity Feed ──
      const handleActivityEvent = (activity) => {
        if (!active) return;
        setActivityStream((prev) => [activity, ...prev.slice(0, 49)]);
      };
      socket.on('activity_event', handleActivityEvent);
    };

    initRealtime();

    return () => {
      active = false;
      if (socketInstance) {
        socketInstance.emit('leave_section', { sectionId });
        socketInstance.off('connect');
        socketInstance.off('disconnect');
        socketInstance.off('error');
        socketInstance.off('presence_update');
        socketInstance.off('initial_block_focus');
        socketInstance.off('block_focus_changed');
        socketInstance.off('subsection_created');
        socketInstance.off('subsection_updated');
        socketInstance.off('subsection_deleted');
        socketInstance.off('section_updated');
        socketInstance.off('collaborator_changed');
        socketInstance.off('activity_event');
      }

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
